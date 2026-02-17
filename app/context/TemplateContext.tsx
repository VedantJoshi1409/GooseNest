"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface Template {
  id: number;
  name: string;
  code?: string;
}

interface TemplateWithRequirements extends Template {
  requirements?: any[];
}

interface TemplateContextType {
  templates: Template[];
  selectedTemplate: TemplateWithRequirements | null;
  isLoading: boolean;
  error: string | null;
  selectTemplate: (templateId: number) => Promise<void>;
  refreshFromDB: () => Promise<void>;
  clearTemplate: () => void;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

const STORAGE_KEY = "goose_nest_templates";
const SELECTED_TEMPLATE_KEY = "goose_nest_selected_template";

export function TemplateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithRequirements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached templates list on mount (not the selected template — that comes from DB per user)
  useEffect(() => {
    try {
      const cachedTemplates = sessionStorage.getItem(STORAGE_KEY);
      if (cachedTemplates) {
        setTemplates(JSON.parse(cachedTemplates));
      }
    } catch (err) {
      console.error("Error loading cached data:", err);
    }
  }, []);

  // Fetch all templates and user's saved degree
  useEffect(() => {
    if (!user) {
      setSelectedTemplate(null);
      sessionStorage.removeItem(SELECTED_TEMPLATE_KEY);
      setIsLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);

        // Fetch templates list if not cached
        if (templates.length === 0) {
          const templatesRes = await fetch("/api/templates");
          if (templatesRes.ok) {
            const data = await templatesRes.json();
            setTemplates(data);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          }
        }

        // Always load user's degree from DB when user changes
        if (user) {
          const degreeRes = await fetch(`/api/users/${user.id}/degree`);
          if (degreeRes.ok) {
            const degreeData = await degreeRes.json();
            let saved: TemplateWithRequirements | null = null;

            if (degreeData.type === "plan" && degreeData.plan) {
              saved = {
                id: degreeData.plan.templateId ?? degreeData.plan.id,
                name: degreeData.plan.name,
                requirements: degreeData.plan.requirements,
              };
            }

            if (saved) {
              setSelectedTemplate(saved);
              sessionStorage.setItem(SELECTED_TEMPLATE_KEY, JSON.stringify(saved));
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        console.error("Error loading initial data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTemplate = async (templateId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/templates/${templateId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch template details");
      }

      const data = await response.json();
      setSelectedTemplate(data);

      // Cache the selected template
      sessionStorage.setItem(SELECTED_TEMPLATE_KEY, JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch template details");
      console.error("Error fetching template details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFromDB = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const degreeRes = await fetch(`/api/users/${user.id}/degree`);
      if (degreeRes.ok) {
        const degreeData = await degreeRes.json();
        let saved: TemplateWithRequirements | null = null;

        if (degreeData.type === "plan" && degreeData.plan) {
          saved = {
            id: degreeData.plan.templateId ?? degreeData.plan.id,
            name: degreeData.plan.name,
            requirements: degreeData.plan.requirements,
          };
        }

        setSelectedTemplate(saved);
        if (saved) {
          sessionStorage.setItem(SELECTED_TEMPLATE_KEY, JSON.stringify(saved));
        } else {
          sessionStorage.removeItem(SELECTED_TEMPLATE_KEY);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh degree");
    } finally {
      setIsLoading(false);
    }
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    sessionStorage.removeItem(SELECTED_TEMPLATE_KEY);
  };

  return (
    <TemplateContext.Provider
      value={{
        templates,
        selectedTemplate,
        isLoading,
        error,
        selectTemplate,
        refreshFromDB,
        clearTemplate,
      }}
    >
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate() {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error("useTemplate must be used within a TemplateProvider");
  }
  return context;
}
