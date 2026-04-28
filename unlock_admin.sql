-- Déverrouiller un compte admin immédiatement
-- Remplacez 'admin@example.com' par l'email de l'admin verrouillé

UPDATE users 
SET 
    statut = 'actif',
    tentatives_connexion = 0,
    verrouille_jusqu = NULL
WHERE 
    email = 'admin@example.com';

-- Ou par ID si vous le connaissez:
-- UPDATE users SET statut = 'actif', tentatives_connexion = 0, verrouille_jusqu = NULL WHERE id = 1;




