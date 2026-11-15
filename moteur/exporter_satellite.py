"""Exporte les conseils satellites vulgarisés (Korhogo & Bouaké) pour l'application hors connexion.

    python -m moteur.exporter_satellite
"""

import json
import pandas as pd
from donnees.config import RACINE, charger, points

SYNTHESE_PATH = RACINE / "data" / "clean" / "synthese_agro_climatique.csv"
SORTIE = RACINE / "app" / "donnees" / "parcelles_satellite.json"


def exporter_satellite_verifie() -> None:
    grille_gps = {p.id: p for p in points(charger())}
    df = pd.read_csv(SYNTHESE_PATH, dtype={"point_id": str})
    resultats = []

    for _, row in df.iterrows():
        ville = str(row["ville"]).strip().lower()
        nom_ville = "Korhogo" if ville == "korhogo" else "Bouaké"
        pid = str(row["point_id"]).strip().zfill(2)
        cle_point = f"{ville}_{pid}"
        pt_gps = grille_gps[cle_point]

        ndvi_pluie = float(row["ndvi_saison_pluies_moy"])
        est_urbain = int(row["code_occupation_sol_igbp"]) == 13
        sante_pct = int(round(min(95, max(25, ndvi_pluie * 115))))
        terre_fatiguee = bool(ndvi_pluie < 0.65 and not est_urbain)

        if est_urbain:
            etat_libelle = "Zone habitée"
            niveau_couleur = "orange"
            resume = (
                f"Vue du ciel autour de {nom_ville}, ce secteur correspond à une zone habitée. "
                "Pour vos champs situés autour du village, alternez toujours le maïs ou le coton avec de l'arachide ou du niébé."
            )
            conseil_simple = "Changez de culture chaque saison (céréale puis légumineuse) pour éviter d'épuiser la terre."
        elif terre_fatiguee:
            etat_libelle = "Terre un peu fatiguée"
            niveau_couleur = "orange"
            resume = (
                f"Vue du ciel autour de {nom_ville}, les plantations montrent des signes de fatigue. "
                "Pour reposer votre terre et éviter les maladies, plantez de l'arachide ou du niébé la prochaine saison."
            )
            conseil_simple = (
                "Ne replantez pas la même culture au même endroit : l'arachide ou le niébé vont nourrir la terre naturellement."
            )
        else:
            etat_libelle = "Plantation en bonne forme"
            niveau_couleur = "vert"
            resume = (
                f"Vue du ciel autour de {nom_ville}, les plantations sont bien vertes et en pleine forme. "
                "Votre terre répond bien aux pluies : gardez une rotation avec du niébé ou de l'arachide pour la protéger."
            )
            conseil_simple = (
                "Continuez d'alterner vos cultures (coton, maïs ou sorgho suivis d'une légumineuse) pour garder un bon rendement."
            )

        resultats.append({
            "ville": ville,
            "point_id": pid,
            "lat": pt_gps.lat,
            "lon": pt_gps.lon,
            "etat_libelle": etat_libelle,
            "niveau_couleur": niveau_couleur,
            "sante_pct": sante_pct,
            "resume": resume,
            "explications": [
                {
                    "texte": f"État général vu du ciel : {etat_libelle.lower()} ({sante_pct} % de vigueur).",
                    "niveau": "mesure",
                    "source": "Images satellites NASA (2001 à 2024)",
                    "detail": f"Secteur de {nom_ville}.",
                },
                {
                    "texte": conseil_simple,
                    "niveau": "hypothese",
                    "source": "Conseil agronomique",
                    "detail": "À confirmer avec votre agent ANADER.",
                },
            ],
        })

    SORTIE.write_text(json.dumps({"points": resultats}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] {SORTIE.relative_to(RACINE)} mis à jour ({len(resultats)} points vulgarisés)")


if __name__ == "__main__":
    exporter_satellite_verifie()
