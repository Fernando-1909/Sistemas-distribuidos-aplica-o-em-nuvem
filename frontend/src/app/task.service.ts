import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';
import { Task, TaskInput } from './task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/tasks/`;

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
