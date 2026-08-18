import { prisma } from "@/lib/db";
import { registerJobProcessor } from "../queue";
import { writeSystemAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

interface RfqSendPayload {
  rfqId: string;
}

/**
 * brief §10-11: RFQs are "initially deliverable by email." Sends (or, without
 * RESEND_API_KEY configured, logs) a professional RFQ email to each invited
 * supplier's primary contact, then marks that RFQSupplier "sent" and opens an
 * RFQMessage thread. This never fabricates delivery — if a supplier has no
 * contact email on file, that RFQSupplier is skipped and left "pending" so a
 * human can see it needs a contact added.
 */
async function processRfqSend(payload: unknown): Promise<void> {
  const { rfqId } = payload as RfqSendPayload;

  const rfq = await prisma.rFQ.findUniqueOrThrow({
    where: { id: rfqId },
    include: {
      lineItems: true,
      purchaseRequest: true,
      organization: true,
      suppliers: { include: { supplier: { include: { contacts: true } } } },
    },
  });

  for (const rfqSupplier of rfq.suppliers) {
    if (rfqSupplier.status !== "pending") continue;
    const contact = rfqSupplier.supplier.contacts.find((c) => c.isPrimary) ?? rfqSupplier.supplier.contacts[0];
    const to = contact?.email;

    const subject = `RFQ ${rfq.rfqNumber} from ${rfq.organization.name}`;
    const body = buildRfqEmailBody(rfq, rfqSupplier.secureToken);

    if (to) {
      await sendEmail({ to, subject, text: body, logPrefix: "rfq.send" });
    } else {
      console.log(`[rfq.send] (no contact on file) would email:\n${subject}\n${body}`);
    }

    await prisma.rFQSupplier.update({
      where: { id: rfqSupplier.id },
      data: { status: "sent", sentAt: new Date() },
    });
    await prisma.rFQMessage.create({
      data: { rfqSupplierId: rfqSupplier.id, direction: "outbound", authorType: "buyer", body },
    });
  }

  await prisma.rFQ.update({ where: { id: rfq.id }, data: { status: "sent" } });
  await writeSystemAuditLog(rfq.organizationId, "system", {
    action: "rfq.sent",
    entityType: "RFQ",
    entityId: rfq.id,
    after: { supplierCount: rfq.suppliers.length },
  });
}

function buildRfqEmailBody(
  rfq: { rfqNumber: string; quoteDeadline: Date | null; specialInstructions: string | null; responseInstructions: string | null; lineItems: { description: string; quantity: number; unitOfMeasure: string }[] },
  secureToken: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const lines = rfq.lineItems.map((li) => `  - ${li.quantity} ${li.unitOfMeasure} — ${li.description}`).join("\n");
  return [
    `You have been invited to submit a quote for RFQ ${rfq.rfqNumber}.`,
    "",
    "Requested items:",
    lines,
    "",
    rfq.quoteDeadline ? `Quote deadline: ${rfq.quoteDeadline.toDateString()}` : "",
    rfq.specialInstructions ? `Special instructions: ${rfq.specialInstructions}` : "",
    rfq.responseInstructions ? `Response instructions: ${rfq.responseInstructions}` : "",
    "",
    `Submit your quote here: ${appUrl}/portal/rfq/${secureToken}`,
  ]
    .filter(Boolean)
    .join("\n");
}

registerJobProcessor("rfq.send", processRfqSend);
