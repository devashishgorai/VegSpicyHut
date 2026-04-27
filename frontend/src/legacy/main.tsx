import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@/lib/api-client-react";
import { TOKEN_KEY } from "@/lib/constants";

setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

export { TOKEN_KEY };

createRoot(document.getElementById("root")!).render(<App />);
