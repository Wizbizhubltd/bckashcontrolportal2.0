import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { keepFocusedFieldVisible } from "./utils/keepFocusedFieldVisible";

keepFocusedFieldVisible();

createRoot(document.getElementById("root")!).render(<App />);
