// Test unitaire du UsersService (généré par NestJS, exécuté par Vitest avec "npm test").
// Un fichier ".spec.ts" contient des tests : on vérifie automatiquement que le code fait ce qu'on attend.
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service.js';

// describe : regroupe les tests d'un même élément (ici le service).
describe('UsersService', () => {
  let service: UsersService;

  // beforeEach : exécuté avant chaque test. On fabrique un mini-module de test
  // qui contient uniquement le service à tester, isolé du reste de l'application.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // it : un test. expect(...).toBeDefined() vérifie que le service a bien été créé.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
