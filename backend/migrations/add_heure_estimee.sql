-- Migration: Ajout de la colonne heure_estimee à la table tickets
-- Date: 2026-04-14

-- Ajouter la colonne heure_estimee (HH:MM)
ALTER TABLE tickets 
ADD COLUMN heure_estimee VARCHAR(5) NULL COMMENT 'Heure estimée de passage calculée à la création (HH:MM)' 
AFTER client_nom;

-- Mettre à jour les tickets existants avec une heure estimée calculée
-- UPDATE tickets 
-- SET heure_estimee = DATE_FORMAT(DATE_ADD(created_at, INTERVAL (position * 15) MINUTE), '%H:%i')
-- WHERE heure_estimee IS NULL AND statut = 'en_attente';

-- Vérification
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tickets' 
AND COLUMN_NAME = 'heure_estimee';
