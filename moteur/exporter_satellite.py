"""Exporte les indicateurs satellites MODIS réels (Korhogo & Bouaké) pour l'application hors connexion.

    python -m moteur.exporter_satellite
"""

import json
import pandas as pd
from donnees.config import RACINE, charger, points

SYNTHESE_PATH = RACINE / "data" / "clean" / "synthese_agro_climatique.csv"
SORTIE = RACINE / "app" / "donnees" / "parcelles_satellite.json"


def _virgule(x: float, decimales: int = 2) -> str:
    return f"{x:.{decimales}f}".replace(".", ",")


def exporter_satellite_verifie() -> None:
    grille_gps = {p.id: p for p in points(charger())}
    df = pd.read_csv(SYNTHESE_PATH, dtype={"point_id": str})
    resultats = []

    for _, row in df.iterrows():
        ville = str(row["ville"]).strip().lower()
        pid = str(row["point_id"]).strip().zfill(2)
        cle_point = f"{ville}_{pid}"
        pt_gps = grille_gps[cle_point]

        ndvi_pluie = float(row["ndvi_saison_pluies_moy"])
        ndvi_seche = float(row["ndvi_saison_seche_moy"])
        occupation = str(row["occupation_sol_libelle"])
        est_urbain = int(row["code_occupation_sol_igbp"]) == 13
        rupture = bool(ndvi_pluie < 0.65 and not est_urbain)

        motif = (
            "Zone urbaine détectée par satellite : les conseils concernent les parcelles agricoles voisines."
            if est_urbain
            else (
                "Vigueur végétale modérée en saison des pluies : privilégier une légumineuse (arachide, niébé) pour enrichir le sol."
                if rupture
                else "Couvert végétal dense en saison des pluies : poursuite possible de la rotation planifiée."
            )
        )

        resultats.append({
            "ville": ville,
            "point_id": pid,
            "lat": pt_gps.lat,
            "lon": pt_gps.lon,
            "occupation_sol": occupation,
            "ndvi_pluie": round(ndvi_pluie, 3),
            "ndvi_seche": round(ndvi_seche, 3),
            "rupture_recommandee": rupture,
            "resume": (
                f"Observation satellite NASA MODIS autour de {ville.capitalize()}. "
                f"Indice de vigueur végétale de {_virgule(ndvi_pluie, 2)} en saison des pluies "
                f"et {_virgule(ndvi_seche, 2)} en saison sèche. {motif}"
            ),
            "explications": [
                {
                    "texte": f"Occupation du sol mesurée par satellite : {occupation}.",
                    "niveau": "mesure",
                    "source": "NASA AppEEARS MODIS MCD12Q1 (2001 à 2024)",
                    "detail": f"Point de grille {cle_point} ({pt_gps.lat}, {pt_gps.lon}).",
                },
                {
                    "texte": motif,
                    "niveau": "hypothese",
                    "source": "Règle agronomique CodeX Africa",
                    "detail": "À confirmer au champ avec votre conseiller ANADER.",
                },
            ],
        })

    SORTIE.write_text(json.dumps({"points": resultats}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] {SORTIE.relative_to(RACINE)} généré ({len(resultats)} points réels Korhogo & Bouaké)")


if __name__ == "__main__":
    exporter_satellite_verifie()
