import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TokenAuthGuard } from '../documents/guards/token-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { PreventSelfUpdateGuard } from './guards/prevent-self-update.guard';

@UseGuards(TokenAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('get')
  @UseGuards(AdminGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Post('create')
  @UseGuards(AdminGuard)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('update')
  @UseGuards(AdminGuard, PreventSelfUpdateGuard)
  update(@Body() body: UpdateUserDto & { user_id: string }) {
    const { user_id, ...updateUserDto } = body;
    return this.usersService.update(user_id, updateUserDto);
  }

  @Post('delete')
  @UseGuards(AdminGuard, PreventSelfUpdateGuard)
  remove(@Body() body: { user_id: string }) {
    return this.usersService.remove(body.user_id);
  }
}
