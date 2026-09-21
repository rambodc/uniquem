import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
async function invoke<TRequest, TResponse>(name: string, data?: TRequest) { return (await httpsCallable<TRequest, TResponse>(functions, name)(data as TRequest)).data; }
export type Inquiry = { id: string; inquiryType: string; name: string; email: string; company?: string; phone?: string; message: string; createdAt: string | null; archived: boolean };
export type InquiryList = { inquiries: Inquiry[]; total: number; nextCursor: number | null };
export const submitContactInquiry = (data: Record<string, string>) => invoke("submitContactInquiry", data);
export const listContactInquiries = (data: { archived: boolean; query?: string; cursor?: number }) => invoke<typeof data, InquiryList>("listContactInquiries", data);
export const archiveContactInquiry = (inquiryId: string) => invoke("archiveContactInquiry", { inquiryId });
export const restoreContactInquiry = (inquiryId: string) => invoke("restoreContactInquiry", { inquiryId });
