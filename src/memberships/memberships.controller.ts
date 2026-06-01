import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { RegisterCardDto } from './dto/register-card.dto';

@Controller('api/v1/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMembershipDto) {
    return this.membershipsService.create(dto);
  }

  @Get()
  findAll(@Query('branchId') branchId?: string) {
    return this.membershipsService.findAll(branchId);
  }

  @Get('by-card/:cardUuid')
  findByCardUuid(@Param('cardUuid') cardUuid: string) {
    return this.membershipsService.findByCardUuid(cardUuid);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membershipsService.findOne(id);
  }

  @Post(':id/register-card')
  @HttpCode(HttpStatus.OK)
  registerCard(@Param('id') id: string, @Body() dto: RegisterCardDto) {
    return this.membershipsService.registerCard(id, dto.cardUuid);
  }

  @Post(':id/unregister-card')
  @HttpCode(HttpStatus.OK)
  unregisterCard(@Param('id') id: string) {
    return this.membershipsService.unregisterCard(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMembershipDto) {
    return this.membershipsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.membershipsService.remove(id);
  }
}
