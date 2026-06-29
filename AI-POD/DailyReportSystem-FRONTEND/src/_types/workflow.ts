import { JSX } from "react";
import { AiModelType } from "@/_types/admin";

export type AiWorkflowType = {
  id: string;
  reference:string;
  title: string;
  system_prompt: string;
  description: string;
  icon: JSX.Element;
  color: string;
  category: string;
  model: AiModelType;
}