"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProjectSelector from "@/components/ProjectSelector";
import SegmentList from "@/components/SegmentList";
import PreviewPlayer from "@/components/PreviewPlayer";
import GenerateButton from "@/components/GenerateButton";
import { Project, Segment } from "@/lib/types";
import { loadProjects, saveProjects, createNewProject } from "@/lib/localStorage";
import { validateAllSegments } from "@/lib/validation";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);

  // Load projects on mount
  useEffect(() => {
    const loadedProjects = loadProjects();

    // Sort projects by most recently updated
    const sortedProjects = loadedProjects.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    setProjects(sortedProjects);

    // Check URL for project ID
    const urlProjectId = searchParams.get('project');

    if (urlProjectId && sortedProjects.find(p => p.id === urlProjectId)) {
      // Use project from URL if it exists
      setCurrentProjectId(urlProjectId);
    } else if (sortedProjects.length > 0) {
      // Automatically select the most recently updated project
      const projectId = sortedProjects[0].id;
      setCurrentProjectId(projectId);
      router.replace(`/?project=${projectId}`);
    } else {
      // Create a new project with random name if none exist
      const newProject = createNewProject();
      setProjects([newProject]);
      setCurrentProjectId(newProject.id);
      router.replace(`/?project=${newProject.id}`);
    }
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  useEffect(() => {
    if (currentProject) {
      setSegments(currentProject.segments);
    }
  }, [currentProjectId]);

  useEffect(() => {
    if (currentProjectId && segments.length >= 0) {
      const updatedProjects = projects.map(p =>
        p.id === currentProjectId
          ? { ...p, segments, updatedAt: new Date().toISOString() }
          : p
      );
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
    }
  }, [segments]);

  const handleProjectChange = (projectId: string) => {
    setCurrentProjectId(projectId);
    setCurrentSegmentIndex(0);
    router.push(`/?project=${projectId}`);
  };

  const handleProjectCreate = () => {
    const newProject = createNewProject();
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    setCurrentProjectId(newProject.id);
    saveProjects(updatedProjects);
    router.push(`/?project=${newProject.id}`);
  };

  const handleProjectRename = (projectId: string, newName: string) => {
    const updatedProjects = projects.map(p =>
      p.id === projectId ? { ...p, name: newName } : p
    );
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  const handleProjectDelete = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjects(updatedProjects);

    if (projectId === currentProjectId) {
      if (updatedProjects.length > 0) {
        const newProjectId = updatedProjects[0].id;
        setCurrentProjectId(newProjectId);
        router.push(`/?project=${newProjectId}`);
      } else {
        const newProject = createNewProject();
        setProjects([newProject]);
        setCurrentProjectId(newProject.id);
        router.push(`/?project=${newProject.id}`);
      }
    }
  };

  const handleProjectDuplicate = (projectId: string) => {
    const projectToDuplicate = projects.find(p => p.id === projectId);
    if (projectToDuplicate) {
      const duplicatedProject: Project = {
        ...projectToDuplicate,
        id: crypto.randomUUID(),
        name: `${projectToDuplicate.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedProjects = [...projects, duplicatedProject];
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      setCurrentProjectId(duplicatedProject.id);
      router.push(`/?project=${duplicatedProject.id}`);
    }
  };

  const validationResult = validateAllSegments(segments);
  const isValid = validationResult.isValid;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            Parody Song Generator
          </h1>
        </div>
      </header>

      {/* Main Content - Centered Preview */}
      <main className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        {/* Project Selector */}
        <div className="flex-shrink-0 mb-4 sm:mb-6">
          <ProjectSelector
            projects={projects}
            currentProjectId={currentProjectId}
            onProjectChange={handleProjectChange}
            onProjectCreate={handleProjectCreate}
            onProjectRename={handleProjectRename}
            onProjectDelete={handleProjectDelete}
            onProjectDuplicate={handleProjectDuplicate}
          />
        </div>

        {/* Preview Player - Center */}
        <div className="flex-shrink-0 mb-4 sm:mb-6">
          <PreviewPlayer
            segments={segments}
            currentSegmentIndex={currentSegmentIndex}
            onSegmentChange={setCurrentSegmentIndex}
            downloadButton={
              <GenerateButton
                segments={segments}
                isValid={isValid}
                validationErrors={validationResult.errors}
                projectName={currentProject?.name || "Untitled"}
                compact
              />
            }
          />
        </div>

        {/* Horizontal Segment List */}
        <div className="flex-1 min-h-0">
          <SegmentList
            segments={segments}
            onSegmentsChange={setSegments}
            currentSegmentIndex={currentSegmentIndex}
            onSegmentClick={setCurrentSegmentIndex}
            onPreview={(videoId, start, end) => {
              if ((window as any).__previewHandler) {
                (window as any).__previewHandler(videoId, start, end);
              }
            }}
            horizontal
          />
        </div>
      </main>
    </div>
  );
}
