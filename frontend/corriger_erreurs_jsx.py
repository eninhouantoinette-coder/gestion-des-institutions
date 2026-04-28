#!/usr/bin/env python3
"""Script pour corriger les erreurs de syntaxe JSX créées par la suppression d'icônes"""

import os
import re
import glob

def corriger_fichier(fichier):
    """Corriger les erreurs JSX dans un fichier"""
    try:
        with open(fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
        
        original = contenu
        
        # Corriger les imports manquants
        contenu = re.sub(r'import\s*\{[^}]*\}\s*from\s*[\'"]lucide-react[\'"];?', '', contenu)
        
        # Corriger les retours JSX incomplets
        contenu = re.sub(r'return\s*</Layout>;', 'return <Layout title="Agences"><PageLoader /></Layout>;', contenu)
        
        # Corriger les fragments JSX manquants
        contenu = re.sub(r'return\s*\(\s*<>', 'return (<>', contenu)
        
        # Corriger les boutons sans icônes
        contenu = re.sub(r'<[A-Z][a-zA-Z]*(?:\s+[^>]*)?\s*/>', '', contenu)
        
        # Corriger les attributs onClick mal formés
        contenu = re.sub(r'onClick=\{[^}]+\}\s*style=\{[^}]+\}', 'onClick={() => openEdit(ag)}', contenu)
        contenu = re.sub(r'onClick=\{[^}]+\}\s*style=\{[^}]+\}', 'onClick={() => { setSelId(ag.id); setShowDelete(true); }}', contenu)
        
        # Nettoyer les lignes vides multiples
        contenu = re.sub(r'\n\s*\n\s*\n', '\n\n', contenu)
        
        if contenu != original:
            with open(fichier, 'w', encoding='utf-8') as f:
                f.write(contenu)
            print(f"Corrigé: {fichier}")
            return True
        else:
            print(f"Pas de modification: {fichier}")
            return False
            
    except Exception as e:
        print(f"Erreur avec {fichier}: {e}")
        return False

def main():
    # Fichiers spécifiques à corriger
    fichiers_a_corriger = [
        'src/pages/admin/Agences.jsx',
        'src/pages/admin/Configuration.jsx',
        'src/pages/admin/Dashboard.jsx',
        'src/pages/admin/Logs.jsx',
        'src/pages/admin/Services.jsx',
        'src/pages/admin/Utilisateurs.jsx',
        'src/pages/agent/Dashboard.jsx',
        'src/pages/agent/FileAttente.jsx',
        'src/pages/agent/MesTaches.jsx',
        'src/pages/agent/Profil.jsx',
        'src/pages/auth/Login.jsx',
        'src/pages/auth/RegisterClient.jsx',
        'src/pages/auth/RegisterInstitution.jsx',
        'src/pages/client/Dashboard.jsx',
        'src/pages/client/Historique.jsx',
        'src/pages/client/MesRdv.jsx',
        'src/pages/client/MonTicket.jsx',
        'src/pages/client/Profil.jsx'
    ]
    
    print(f"Correction de {len(fichiers_a_corriger)} fichiers...")
    
    modifies = 0
    for fichier in fichiers_a_corriger:
        if os.path.exists(fichier):
            if corriger_fichier(fichier):
                modifies += 1
    
    print(f"\nTerminé! {modifies} fichiers modifiés")

if __name__ == "__main__":
    main()
