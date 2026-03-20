import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import preferenceService from '../services/preferenceService';
import { success } from '../utils/response';

export class PreferenceController {
  /**
   * GET /api/user/preference
   */
  async getPreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const preference = await preferenceService.getPreference(req.user.id);
      success(res, preference);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/user/preference
   */
  async updatePreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const preference = await preferenceService.updatePreference(req.user.id, req.body);
      success(res, preference);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/user/preference/reset
   */
  async resetPreference(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('未认证');

      const preference = await preferenceService.resetPreference(req.user.id);
      success(res, preference);
    } catch (error) {
      next(error);
    }
  }
}

export default new PreferenceController();

