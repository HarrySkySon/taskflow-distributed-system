import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';

const router = Router();
const projectController = new ProjectController();

// Project CRUD routes
router.get('/projects', projectController.getAllProjects.bind(projectController));
router.get('/projects/:id', projectController.getProjectById.bind(projectController));
router.post('/projects', projectController.createProject.bind(projectController));
router.put('/projects/:id', projectController.updateProject.bind(projectController));
router.delete('/projects/:id', projectController.deleteProject.bind(projectController));

// Project members routes
router.post('/projects/:id/members', projectController.addProjectMember.bind(projectController));
router.delete('/projects/:id/members/:user_id', projectController.removeProjectMember.bind(projectController));

export default router;
