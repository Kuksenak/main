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
  { id: 's9', name: 'Katarzyna Zielińska', email: 'kasia.zielinska@example.com', phone: '+48 503 222 111' },
  { id: 's10', name: 'Lucas Bernard', email: 'lucas.bernard@example.com', phone: '+33 6 21 43 65 87' },
  { id: 's11', name: 'Olivia Brown', email: 'olivia.brown@example.com', phone: '+44 7700 900789' },
  { id: 's12', name: 'Michał Lewandowski', email: 'michal.lewandowski@example.com', phone: '+48 601 444 555' },
  { id: 's13', name: 'Camille Petit', email: 'camille.petit@example.com', phone: '+33 7 11 22 33 44' },
  { id: 's14', name: 'Harry Taylor', email: 'harry.taylor@example.com', phone: '+44 7700 900321' },
  { id: 's15', name: 'Agnieszka Wójcik', email: 'agnieszka.wojcik@example.com', phone: '+48 512 666 777' },
  { id: 's16', name: 'Hugo Moreau', email: 'hugo.moreau@example.com', phone: '+33 6 98 87 76 65' },
  { id: 's17', name: 'Amelia Davies', email: 'amelia.davies@example.com', phone: '+44 7700 900654' },
  { id: 's18', name: 'Jakub Kamiński', email: 'jakub.kaminski@example.com', phone: '+48 690 123 456' },
  { id: 's19', name: 'Léa Fournier', email: 'lea.fournier@example.com', phone: '+33 6 44 55 66 77' },
  { id: 's20', name: 'George Evans', email: 'george.evans@example.com', phone: '' },
  { id: 's21', name: 'Zofia Szymańska', email: 'zofia.szymanska@example.com', phone: '+48 505 909 808' },
  { id: 's22', name: 'Nathan Girard', email: '', phone: '+33 7 66 55 44 33' },
  { id: 's23', name: 'Isla Thomas', email: 'isla.thomas@example.com', phone: '+44 7700 900987' },
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
