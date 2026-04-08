"""script to check that all pokemon are in csv"""

import csv
import json
import re

typings = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"]

alias_map = {}
with open("alias.json", "r", encoding="utf-8") as file:
    aliases = json.load(file)

    for canonical, aliases in aliases.items():
        alias_map[canonical.lower()] = canonical
        for alias in aliases:
            alias_map[alias.lower()] = canonical

def normalize_name(name):
    name = name.lower()
    return alias_map.get(name, name)


with open("updated_pokemon.csv", "r", encoding="utf-8") as file:
    reader = csv.reader(file)
    pokemon_dex = {}

    for row in reader:
        pokemon_dex[str(row[1])] = {
            "csv_name": row[0],
            "csv_dex_number": str(row[1]),
            "csv_type1": row[2],
            "csv_type2": row[3] if row[3] else "",
            "csv_generation": row[4].lower(),
        }

    print(f"-----------------missing pokemon-----------------")
    count = 0
    for i in range(1, 1025):
        if str(i) not in pokemon_dex:
            print(f"pokemon with dex number {i} is missing")
            count += 1
    print(f"total pokemon missing: {count}\n")

    generations = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"]

    print(f"---------------checking generations--------------")
    for gen in generations:
        with open(f"gen/gen_{gen}.txt", "r", encoding="utf-8") as gen_file:
            print(f"--checking generation {gen}")
            next(gen_file)

            lines = gen_file.readlines()
            i = 0
            while i < len(lines):
                line = lines[i].strip()
                if not line or not line.startswith("#"):
                    i += 1
                    continue
                
                if i + 1 < len(lines):
                    line2 = lines[i + 1].strip()
                else:
                    break
                parts = line.split("\t")
                parts2 = line2.split("\t")
                dex_number_ = parts[0]
                dex_number_ = dex_number_.lstrip("#").lstrip("0")
                name = parts[1].lower()
                #print(f"part2 0 is {parts2[0]}")
                if len(parts2) == 2 and parts2[0].lower() in typings:
                    type1 = parts2[0].lower()
                    type2 = parts2[1].lower() if len(parts2) > 1 else ""
                elif len(parts2) > 1 and parts2[1].lower() in typings:
                    #print(f"pokemon with dex number {dex_number_} is {parts2[-2]}")
                    if parts2[-2].lower() in typings:
                        type1 = parts2[-2].lower()
                        type2 = parts2[-1].lower()
                    else:
                        #print(f"aaaaaaaa pokemon with dex number {dex_number_} is {parts2[-1]}")
                        type1 = parts2[-1].lower()
                        type2 = ""
                else:
                    
                    if len(parts2) > 2 and parts2[-1].lower() in typings:
                        if parts2[-2].lower() in typings:
                            
                            type1 = parts2[-2].lower()
                            type2 = parts2[-1].lower()
                        else:
                            type1 = parts2[-1].lower()
                            type2 = ""
                    else:
                        type1 = parts2[0].lower()
                        type2 = ""

                if dex_number_ not in pokemon_dex:
                    print(f"pokemon with dex number {dex_number_} is missing from csv")
                else:
                    csv_pokemon = pokemon_dex[dex_number_]
                    if (
                        normalize_name(name) != csv_pokemon["csv_name"]
                        or type1 != csv_pokemon["csv_type1"]
                        or type2 != csv_pokemon["csv_type2"]
                        or gen != csv_pokemon["csv_generation"]
                    ):
                        print(f"\npokemon with dex number {dex_number_} has mismatching data in csv")
                        print(f"csv: name={csv_pokemon['csv_name']}, type1={csv_pokemon['csv_type1']}, type2={csv_pokemon['csv_type2']}, generation={csv_pokemon['csv_generation']}")
                        print(f"txt: name={name}, type1={type1}, type2={type2}, generation={gen}")
                i += 2 

