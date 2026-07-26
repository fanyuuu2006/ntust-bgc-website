import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "臺科大桌遊社",
    template: "%s | 臺科大桌遊社",
  },
  description: "臺科大桌遊社官方網站，提供最新消息、活動資訊與社團介紹。",
  icons: [
    {
      rel: "icon",
      url: "/images/favicon.ico",
    },
  ],
};
