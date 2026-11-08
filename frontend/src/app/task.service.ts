import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';
import { Member, Project, Task, TaskInput } from './task.model';

/** tasks-service: CRUD de tarefas (já devolve responsável e projeto com nome). */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.tasksUrl}/tasks/`;

  list(): Observable<Task[]> {
    return this.http.get<Task[]>(this.url);
  }

  create(task: TaskInput): Observable<Task> {
    return this.http.post<Task>(this.url, task);
  }

  update(id: number, changes: Partial<TaskInput>): Observable<Task> {
    return this.http.patch<Task>(`${this.url}${id}/`, changes);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`);
  }
}

/** users-service: CRUD de responsáveis. */
@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.usersUrl}/members/`;

  list(): Observable<Member[]> {
    return this.http.get<Member[]>(this.url);
  }

  create(member: { name: string; email?: string }): Observable<Member> {
    return this.http.post<Member>(this.url, member);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`);
  }
}

/** projects-service: CRUD de projetos. */
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.projectsUrl}/projects/`;

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(this.url);
  }

  create(project: { name: string; color: string }): Observable<Project> {
    return this.http.post<Project>(this.url, project);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}${id}/`);
  }
}
