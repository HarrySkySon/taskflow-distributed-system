import { Request, Response } from 'express';
import { query } from '../config/database';
import { CreateProjectDTO, UpdateProjectDTO } from '../models/project.model';
import { publishEvent } from '../utils/eventPublisher';

export class ProjectController {
  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const { owner_id, status, limit = 50, offset = 0 } = req.query;

      let queryText = 'SELECT * FROM projects WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (owner_id) {
        queryText += ` AND owner_id = $${paramCount}`;
        params.push(owner_id);
        paramCount++;
      }

      if (status) {
        queryText += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await query(queryText, params);

      res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rowCount,
        limit,
        offset
      });
    } catch (error: any) {
      console.error('Error in getAllProjects:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { include_members } = req.query;

      const projectResult = await query(
        'SELECT * FROM projects WHERE id = $1',
        [id]
      );

      if (projectResult.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      const project = projectResult.rows[0];

      if (include_members === 'true') {
        const membersResult = await query(
          'SELECT * FROM project_members WHERE project_id = $1',
          [id]
        );
        project.members = membersResult.rows;
      }

      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error: any) {
      console.error('Error in getProjectById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const projectData: CreateProjectDTO = req.body;

      if (!projectData.name || !projectData.owner_id) {
        res.status(400).json({
          success: false,
          message: 'Name and owner_id are required'
        });
        return;
      }

      const result = await query(
        `INSERT INTO projects (name, description, owner_id, start_date, end_date, deadline, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          projectData.name,
          projectData.description || null,
          projectData.owner_id,
          projectData.start_date || null,
          projectData.end_date || null,
          projectData.deadline || null,
          projectData.priority || 'medium'
        ]
      );

      const newProject = result.rows[0];

      // Automatically add owner as project member with role 'owner'
      await query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [newProject.id, projectData.owner_id, 'owner']
      );

      // Publish project.created event
      await publishEvent('project.created', newProject);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: newProject
      });
    } catch (error: any) {
      console.error('Error in createProject:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateProjectDTO = req.body;

      const checkResult = await query('SELECT * FROM projects WHERE id = $1', [id]);

      if (checkResult.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        params.push(updateData.name);
        paramCount++;
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        params.push(updateData.description);
        paramCount++;
      }

      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        params.push(updateData.status);
        paramCount++;
      }

      if (updateData.start_date !== undefined) {
        updateFields.push(`start_date = $${paramCount}`);
        params.push(updateData.start_date);
        paramCount++;
      }

      if (updateData.end_date !== undefined) {
        updateFields.push(`end_date = $${paramCount}`);
        params.push(updateData.end_date);
        paramCount++;
      }

      if (updateData.deadline !== undefined) {
        updateFields.push(`deadline = $${paramCount}`);
        params.push(updateData.deadline);
        paramCount++;
      }

      if (updateData.priority !== undefined) {
        updateFields.push(`priority = $${paramCount}`);
        params.push(updateData.priority);
        paramCount++;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) {
        res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
        return;
      }

      params.push(id);
      const result = await query(
        `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      );

      const updatedProject = result.rows[0];

      // Publish project.updated event
      await publishEvent('project.updated', updatedProject);

      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: updatedProject
      });
    } catch (error: any) {
      console.error('Error in updateProject:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const checkResult = await query('SELECT * FROM projects WHERE id = $1', [id]);

      if (checkResult.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      const deletedProject = checkResult.rows[0];

      await query('DELETE FROM projects WHERE id = $1', [id]);

      // Publish project.deleted event
      await publishEvent('project.deleted', { id: deletedProject.id, name: deletedProject.name });

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error: any) {
      console.error('Error in deleteProject:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async addProjectMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { user_id, role } = req.body;

      if (!user_id || !role) {
        res.status(400).json({
          success: false,
          message: 'user_id and role are required'
        });
        return;
      }

      const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);

      if (projectResult.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      const result = await query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
         RETURNING *`,
        [id, user_id, role]
      );

      res.status(201).json({
        success: true,
        message: 'Project member added successfully',
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Error in addProjectMember:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async removeProjectMember(req: Request, res: Response): Promise<void> {
    try {
      const { id, user_id } = req.params;

      const result = await query(
        'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *',
        [id, user_id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: 'Project member not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Project member removed successfully'
      });
    } catch (error: any) {
      console.error('Error in removeProjectMember:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}
