export interface Project {
  id?: number;
  name: string;
  description?: string;
  owner_id: number;
  status?: string;
  start_date?: Date;
  end_date?: Date;
  deadline?: Date;
  priority?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ProjectMember {
  id?: number;
  project_id: number;
  user_id: number;
  role: string;
  joined_at?: Date;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  owner_id: number;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  priority?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  priority?: string;
}

export interface ProjectWithMembers extends Project {
  members?: ProjectMember[];
}
