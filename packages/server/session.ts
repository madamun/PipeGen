import { auth } from "./auth";

export async function getServerSession(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}
