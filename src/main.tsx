import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyStoredAccent } from "./lib/theme-accent";

applyStoredAccent();

createRoot(document.getElementById("root")!).render(<App />);
