"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  clearTemplate: () => void;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

const STORAGE_KEY = "goose_nest_templates";
const SELECTED_TEMPLATE_KEY = "goose_nest_selected_template";

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithRequirements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = () => {
      try {
        // Load templates list
        const cachedTemplates = sessionStorage.getItem(STORAGE_KEY);
        if (cachedTemplates) {
          setTemplates(JSON.parse(cachedTemplates));
        }

        // Load selected template
        const cachedSelectedTemplate = sessionStorage.getItem(SELECTED_TEMPLATE_KEY);
        if (cachedSelectedTemplate) {
          setSelectedTemplate(JSON.parse(cachedSelectedTemplate));
        }
      } catch (err) {
        console.error("Error loading cached data:", err);
      }
    };

    loadCachedData();
  }, []);

  // Fetch all templates on mount (only if not cached)
  useEffect(() => {
    const fetchTemplates = async () => {
      // Skip if we already have templates from cache
      if (templates.length > 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/templates");

        if (!response.ok) {
          throw new Error("Failed to fetch templates");
        }

        const data = await response.json();
        setTemplates(data);

        // Cache the templates list
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch templates");
        console.error("Error fetching templates:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [templates.length]);

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
