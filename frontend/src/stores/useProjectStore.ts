import { create } from 'zustand'
import { Project } from '@/types'
import { DEFAULT_SERIAL_CONFIG } from '@/utils/constants'

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  cloudSyncStatus: 'synced' | 'not-synced' | 'syncing' | 'error'
  lastSyncTime: Date | null
  
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCloudSyncStatus: (status: 'synced' | 'not-synced' | 'syncing' | 'error') => void
  updateLastSyncTime: () => void
}

// 默认项目
const createDefaultProject = (): Project => ({
  id: 'default',
  name: '__DEFAULT_PROJECT__', // 特殊标记，用于在显示时动态翻译
  description: '__DEFAULT_PROJECT_DESC__', // 特殊标记，用于在显示时动态翻译
  config: DEFAULT_SERIAL_CONFIG,
  commands: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [createDefaultProject()],
  currentProject: createDefaultProject(),
  cloudSyncStatus: 'not-synced', // 默认未同步（未登录用户）
  lastSyncTime: null,

  setProjects: (projects) => set({ projects }),

  setCurrentProject: (project) => set({ currentProject: project }),
  
  setCloudSyncStatus: (status) => set({ cloudSyncStatus: status }),
  
  updateLastSyncTime: () => set({ lastSyncTime: new Date() }),

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
      currentProject: project,
    })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates, updatedAt: new Date() }
          : state.currentProject,
    })),

  deleteProject: (id) =>
    set((state) => {
      const newProjects = state.projects.filter((p) => p.id !== id)
      const newCurrent =
        state.currentProject?.id === id ? newProjects[0] || null : state.currentProject
      return {
        projects: newProjects,
        currentProject: newCurrent,
      }
    }),
}))

