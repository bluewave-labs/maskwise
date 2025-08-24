import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOnly, MemberAccess } from '../auth/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(req.user.id, updateUserDto);
    
    // Log the profile update
    await this.usersService.logAuditAction(
      req.user.id,
      'UPDATE',
      'user',
      req.user.id,
      { fields: Object.keys(updateUserDto) },
    );

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get current user audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;
    
    return this.usersService.getAuditLogs(req.user.id, {
      skip,
      take: limitNum,
    });
  }

  @Get('audit-logs/all')
  @AdminOnly() // Only admins can view all audit logs
  @ApiOperation({ summary: 'Get all audit logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'All audit logs retrieved' })
  async getAllAuditLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('userId') userId?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;
    
    return this.usersService.getAuditLogs(undefined, {
      skip,
      take: limitNum,
      search,
      action,
      dateFrom,
      dateTo,
      userId,
    });
  }

  @Post()
  @AdminOnly() // Only admins can create users
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const newUser = await this.usersService.create(createUserDto);
    
    // Log the user creation
    await this.usersService.logAuditAction(
      req.user.id,
      'CREATE',
      'user',
      newUser.id,
      { email: createUserDto.email, role: createUserDto.role || 'USER' },
    );

    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  @Get()
  @AdminOnly() // Only admins can list all users
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;
    
    const users = await this.usersService.findAll({
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  @Get(':id')
  @AdminOnly() // Only admins can view other users
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  @Put(':id')
  @AdminOnly() // Only admins can update other users
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    
    // Log the user update
    await this.usersService.logAuditAction(
      req.user.id,
      'UPDATE',
      'user',
      id,
      { fields: Object.keys(updateUserDto) },
    );

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activate(@Param('id') id: string, @Request() req) {
    const activatedUser = await this.usersService.activate(id);
    
    // Log the user activation
    await this.usersService.logAuditAction(
      req.user.id,
      'UPDATE',
      'user',
      id,
      { action: 'activate' },
    );

    const { password, ...userWithoutPassword } = activatedUser;
    return userWithoutPassword;
  }

  @Delete(':id')
  @AdminOnly() // Only admins can deactivate users
  @ApiOperation({ summary: 'Deactivate user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @Request() req) {
    const deactivatedUser = await this.usersService.delete(id);
    
    // Log the user deactivation
    await this.usersService.logAuditAction(
      req.user.id,
      'DELETE',
      'user',
      id,
    );

    const { password, ...userWithoutPassword } = deactivatedUser;
    return userWithoutPassword;
  }

  @Delete(':id/permanent')
  @AdminOnly() // Only admins can permanently delete users
  @ApiOperation({ summary: 'Permanently delete user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User permanently deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot delete this user' })
  async permanentDelete(@Param('id') id: string, @Request() req) {
    // Prevent users from deleting themselves
    if (req.user.id === id) {
      throw new Error('Cannot delete your own account');
    }

    // Get user details before deletion for logging
    const userToDelete = await this.usersService.findById(id);
    if (!userToDelete) {
      throw new Error('User not found');
    }

    // Perform permanent deletion
    await this.usersService.permanentDelete(id);
    
    // Log the permanent deletion
    await this.usersService.logAuditAction(
      req.user.id,
      'DELETE',
      'user',
      id,
      { action: 'permanent_delete', deletedUser: { email: userToDelete.email, name: `${userToDelete.firstName} ${userToDelete.lastName}` } },
    );

    return { 
      message: 'User permanently deleted',
      deletedUser: { 
        id: userToDelete.id,
        email: userToDelete.email,
        name: `${userToDelete.firstName} ${userToDelete.lastName}`
      }
    };
  }
}