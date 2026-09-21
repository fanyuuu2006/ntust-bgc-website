import { getSiteUrl } from "./env";

export const siteConfigs = {
  name: "臺科大桌遊社",

  fullName: "國立臺灣科技大學桌上遊戲研究社",

  title: "臺科大桌上遊戲研究社｜官方網站",

  description: "臺科大桌遊社官方網站暨社團管理平台，整合社團公告、桌遊查詢與借用、社員資格、活動簽到及後台管理等功能。",

  shortDescription: "國立臺灣科技大學桌上遊戲研究社",

  logo: "/images/logo.jpg",

  icon: "/images/favicon.ico",

  get url() {
    return getSiteUrl();
  },
} as const;
