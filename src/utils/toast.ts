import { message } from "antd";

export const toast = {
  success: (text: string) => message.success({ content: text }),
  error: (text: string) => message.error({ content: text }),
  info: (text: string) => message.info({ content: text }),
  loading: (text: string) => message.loading({ content: text, duration: 0 }),
};
