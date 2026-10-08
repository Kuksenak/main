import { Injectable, signal } from '@angular/core';

export type StudentLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export const STUDENT_LEVELS: StudentLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: StudentLevel;
  note: string;
}

export type StudentInput = Omit<Student, 'id'>;

// Fake data until the backend has a students API.
const FAKE_STUDENTS: Student[] = [
  { id: 's1', name: 'Anna Kowalska', email: 'anna.kowalska@example.com', phone: '+48 501 234 567', level: 'B1', note: 'Prefers evening lessons' },
  { id: 's2', name: 'Marc Dubois', email: 'marc.dubois@example.com', phone: '+33 6 12 34 56 78', level: 'A2', note: '' },
  { id: 's3', name: 'Emily Clark', email: 'emily.clark@example.com', phone: '+44 7700 900123', level: 'C1', note: 'Preparing for CAE' },
  { id: 's4', name: 'Piotr Nowak', email: 'piotr.nowak@example.com', phone: '+48 600 111 222', level: 'B2', note: '' },
  { id: 's5', name: 'Julie Martin', email: 'julie.martin@example.com', phone: '+33 7 98 76 54 32', level: 'A1', note: 'Beginner, visual learner' },
  { id: 's6', name: 'Tomasz Wiśniewski', email: 'tomasz.w@example.com', phone: '+48 512 333 444', level: 'B1', note: '' },
  { id: 's7', name: 'Sophie Laurent', email: 'sophie.laurent@example.com', phone: '+33 6 55 44 33 22', level: 'B2', note: 'Business English' },
  { id: 's8', name: 'James Wilson', email: 'james.wilson@example.com', phone: '+44 7700 900456', level: 'C2', note: '' },
];

/** Students store. In-memory fake data for now; same shape the API will use. */
@Injectable({ providedIn: 'root' })
export class StudentService {
  private _students = signal<Student[]>(FAKE_STUDENTS);
  readonly students = this._students.asReadonly();

  create(input: StudentInput): void {
    this._students.update((list) => [...list, { ...input, id: crypto.randomUUID() }]);
  }

  update(id: string, input: StudentInput): void {
    this._students.update((list) => list.map((s) => (s.id === id ? { ...input, id } : s)));
  }

  remove(id: string): void {
    this._students.update((list) => list.filter((s) => s.id !== id));
  }
}
