import { redirect } from "next/navigation";
export default async function Resume() {
    redirect("./resume.pdf");
}
