import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import profileService from '../services/profileService';
import { success, created, paginated } from '../utils/response';

export class ProfileController {
  /**
   * GET /api/profiles
   */
  async getProfiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { page, limit, deviceId } = req.query as any;
      const { profiles, total } = await profileService.getProfiles(req.user.id, {
        page,
        limit,
        deviceId,
      });

      paginated(res, profiles, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/profiles/default
   */
  async getDefaultProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const profile = await profileService.getDefaultProfile(req.user.id);
      success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/profiles/:id
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const profile = await profileService.getProfile(id, req.user.id);
      success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/profiles
   */
  async createProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const profile = await profileService.createProfile(req.user.id, req.body);
      created(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/profiles/:id
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const profile = await profileService.updateProfile(id, req.user.id, req.body);
      success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/profiles/:id
   */
  async deleteProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const result = await profileService.deleteProfile(id, req.user.id);
      success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export default new ProfileController();

