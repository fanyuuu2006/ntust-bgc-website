import { usersRepository } from "@/repositories/users.repository";

type RegisterUserInput = {
  email: string;
  name: string;
};

export const usersService = {
  register: async (payload: RegisterUserInput) => {
    const { email, name } = payload;
    const existingUser = await usersRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("此 Email 已經註冊");
    }

    return usersRepository.create({
      email,
      name,
    });
  },
};
