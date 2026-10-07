// Test unitaire du AuthService (généré par NestJS) : pour l'instant, vérifie seulement que le service est créé.
// Il sera complété avec les cas du plan de tests (docs/qualite/TESTING.md) : compte créé, email déjà utilisé…
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  // Avant chaque test : mini-module contenant uniquement le service, isolé du reste (test "unitaire").
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
