import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, RequirePermissions, type AuthUser } from "../auth/auth.decorators";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions("project:read")
  list(@CurrentUser() user: AuthUser) {
    return this.projects.list(user);
  }

  @Post()
  @RequirePermissions("project:write")
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.projects.create(user, body);
  }

  @Get(":id")
  @RequirePermissions("project:read")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.projects.get(user, id);
  }

  @Patch(":id")
  @RequirePermissions("project:write")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.projects.update(user, id, body);
  }

  @Delete(":id")
  @RequirePermissions("project:delete")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.projects.remove(user, id);
  }

  @Post(":id/blueprints")
  @RequirePermissions("project:write")
  uploadBlueprint(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.projects.uploadBlueprint(user, id, body);
  }

  @Post(":id/orchestrate")
  @RequirePermissions("project:write")
  orchestrate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.projects.orchestrate(user, id);
  }

  @Get(":id/estimate")
  @RequirePermissions("project:read")
  getEstimate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.projects.getEstimate(user, id);
  }
}
