import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import { updateUserProfileSchema } from "./users.schema";

export const usersService = {
  updateProfile: async (userId: string, payload: unknown) => {
    const data = updateUserProfileSchema.parse(payload);

    return userProfilesRepository.updateUserProfile(userId, data);
  },
};
