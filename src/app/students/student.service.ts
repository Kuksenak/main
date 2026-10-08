import { Injectable, signal } from '@angular/core';

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export type StudentInput = Omit<Student, 'id'>;

// Fake data until the backend has a students API.
const FAKE_STUDENTS: Student[] = [
  { id: 's1', name: 'Anna Kowalska', email: 'anna.kowalska@example.com', phone: '+48 501 234 567' },
  { id: 's2', name: 'Marc Dubois', email: 'marc.dubois@example.com', phone: '+33 6 12 34 56 78' },
  { id: 's3', name: 'Emily Clark', email: 'emily.clark@example.com', phone: '+44 7700 900123' },
  { id: 's4', name: 'Piotr Nowak', email: 'piotr.nowak@example.com', phone: '+48 600 111 222' },
  { id: 's5', name: 'Julie Martin', email: 'julie.martin@example.com', phone: '+33 7 98 76 54 32' },
  { id: 's6', name: 'Tomasz Wiśniewski', email: 'tomasz.w@example.com', phone: '+48 512 333 444' },
  { id: 's7', name: 'Sophie Laurent', email: 'sophie.laurent@example.com', phone: '+33 6 55 44 33 22' },
  { id: 's8', name: 'James Wilson', email: 'james.wilson@example.com', phone: '+44 7700 900456' },
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
