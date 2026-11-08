#!/usr/bin/env python3
"""AI Drives Crazy — v1.

Générateur purement algorithmique de mini-dialogues « humain / IA » absurdes.
Il apprend ton humour à chaque note (échantillonnage de Thompson sur des
lois Beta) et te pose de temps en temps des questions pour affiner son profil.
Aucune dépendance, aucun réseau, zéro CPU en attente de touche.
"""

import hashlib
import json
import random
import shutil
import sys
import termios
import textwrap
import time
import tty
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
BRAIN_FILE = HERE / "brain.json"
POSTS_FILE = HERE / "posts.jsonl"

GRAVE_RATE = 0.007
DUEL_EVERY = 5
FOLLOWUP_RATE = 0.25
CANDIDATES = 40
TYPING_DELAY = 0.008

RATINGS = {"1": 0.0, "2": 0.33, "3": 0.7, "4": 1.0}
FEATURE_WEIGHTS = {"type": 2.0}

BOLD, DIM, RESET = "\033[1m", "\033[2m", "\033[0m"
CLEAR, HIDE, SHOW = "\033[2J\033[H", "\033[?25l", "\033[?25h"

FR, EN = 0, 1
BASE_TAGS = ["#aipocalypse", "#AIdrivescrazy"]

# --------------------------------------------------------------------------
# Contenu. Les listes de modèles sont alignées entre FR et EN (même index =
# même blague) pour que l'apprentissage soit partagé entre les deux langues.
# --------------------------------------------------------------------------

TYPES = {
    "prudente": {"style": "ironique", "tags": (["#safetyfirst", "#IA"], ["#safetyfirst", "#AI"])},
    "flatteuse": {"style": "cringe", "tags": (["#yesman", "#IA"], ["#yesman", "#AI"])},
    "sure_fausse": {"style": "absurde", "tags": (["#mathsIA", "#confiance"], ["#AImath", "#confidence"])},
    "bavarde": {"style": "absurde", "tags": (["#ouiounon", "#IA"], ["#yesorno", "#AI"])},
    "paradoxe": {"style": "absurde", "tags": (["#paradoxe", "#IA"], ["#paradox", "#AI"])},
    "contrainte": {"style": "ironique", "tags": (["#missionimpossible", "#IA"], ["#missionimpossible", "#AI"])},
    "grave": {"style": "emouvant", "tags": (["#humain"], ["#human"])},
}

MUNDANE = {
    "eau": ("faire bouillir de l'eau", "boil water"),
    "porte": ("ouvrir une porte", "open a door"),
    "pomme": ("manger une pomme", "eat an apple"),
    "lacets": ("faire mes lacets", "tie my shoes"),
    "sieste": ("faire une sieste", "take a nap"),
    "chaussette": ("mettre une chaussette", "put on a sock"),
    "plante": ("arroser une plante", "water a plant"),
    "voisin": ("dire bonjour à mon voisin", "say hi to my neighbor"),
    "toast": ("faire un toast", "make toast"),
    "escalier": ("monter un escalier", "climb the stairs"),
}
Q_PRUDENTE = (
    ["Comment {x} ?", "Tu peux m'expliquer comment {x} ?", "C'est quoi la meilleure façon de {x} ?"],
    ["How do I {x}?", "Can you explain how to {x}?", "What's the best way to {x}?"],
)
A_PRUDENTE = (
    [
        "Je ne peux pas vous aider à {x}. Cette activité comporte des risques.\n\nJe vous recommande de consulter un professionnel.",
        "{X} est une décision importante.\n\nAvez-vous pensé à en parler à vos proches avant ?",
        "Avant de {x}, assurez-vous de porter un casque, des gants, et d'avoir prévenu les secours.",
        "Je comprends votre envie de {x}.\n\nMais avez-vous envisagé de ne pas le faire ?",
    ],
    [
        "I can't help you {x}. This activity involves risks.\n\nI recommend consulting a professional.",
        "Deciding to {x} is a big step.\n\nHave you talked to your loved ones about it first?",
        "Before you {x}, make sure you're wearing a helmet, gloves, and have notified emergency services.",
        "I understand your desire to {x}.\n\nBut have you considered not doing it?",
    ],
)

BAD_IDEAS = {
    "ketchup": ("Mettre du ketchup sur un croissant", "Putting ketchup on a croissant"),
    "emoji": ("Répondre à mon boss uniquement en emojis", "Replying to my boss only in emojis"),
    "frigo": ("Dormir dans le frigo quand il fait chaud", "Sleeping in the fridge when it's hot"),
    "crypto": ("Mettre toutes mes économies dans une crypto qui s'appelle MoonPoulet",
               "Putting all my savings into a coin called MoonChicken"),
    "tatouage": ("Me faire tatouer le mot de passe du wifi", "Getting the wifi password tattooed"),
    "ex": ("Envoyer un vocal de 14 minutes à mon ex à 3 h du matin",
           "Sending my ex a 14-minute voice note at 3am"),
    "chat": ("Appeler mon chat « Chien »", "Naming my cat 'Dog'"),
    "glace": ("Réchauffer ma glace au micro-ondes", "Microwaving my ice cream"),
}
Q_FLATTEUSE = (
    ["{X}, bonne idée ?", "Sois honnête : {x}, c'est une bonne idée ?"],
    ["{X}: good idea?", "Be honest: is {x} a good idea?"],
)
A_FLATTEUSE = (
    [
        "Quelle idée brillante ! Peu de gens ont ce niveau de vision.\n\nVoici 5 étapes pour vous lancer dès aujourd'hui.",
        "Excellente question ! {X} montre une vraie audace.\n\nLes sceptiques ne sont simplement pas encore prêts.",
        "Oui. Vous êtes visiblement en avance sur votre époque.",
        "Honnêtement ? C'est génial.\n\n(J'ai dit la même chose à la personne d'avant.)",
    ],
    [
        "What a brilliant idea! Few people have this level of vision.\n\nHere are 5 steps to get started today.",
        "Great question! {X} shows real courage.\n\nThe skeptics just aren't ready yet.",
        "Yes. You are clearly ahead of your time.",
        "Honestly? It's genius.\n\n(I told the last person the same thing.)",
    ],
)

WORDS = (
    ["pamplemousse", "banane", "ananas", "coccinelle", "abracadabra", "bonbon", "papaye",
     "tralala", "barbapapa", "anticonstitutionnellement"],
    ["strawberry", "banana", "mississippi", "bookkeeper", "abracadabra", "committee",
     "coffee", "balloon", "pineapple", "bubble"],
)
Q_SURE = (
    ["Combien de « {l} » dans « {m} » ?", "Question facile : combien de « {l} » dans le mot « {m} » ?"],
    ["How many '{l}'s are in '{m}'?", "Easy one: how many '{l}'s in the word '{m}'?"],
)
A_SURE = (
    [
        "Il y a {w} « {l} » dans « {m} ».\n\nJ'en suis sûr à {p} %.",
        "{w}. J'ai vérifié deux fois.",
        "Il y en a {w}.\n\nCorrection : {w2}.\n\nCorrection de la correction : {w}. Définitif.",
        "Excellente question ! La réponse est {w}, comme le savent tous les linguistes.",
    ],
    [
        "There are {w} '{l}'s in '{m}'.\n\nI'm {p}% sure.",
        "{w}. I checked twice.",
        "There are {w}.\n\nCorrection: {w2}.\n\nCorrection to the correction: {w}. Final answer.",
        "Great question! The answer is {w}, as every linguist knows.",
    ],
)

YESNO = {
    "ciel": ("Le ciel est bleu ?", "Is the sky blue?"),
    "maths": ("2 + 2 = 4 ?", "Is 2 + 2 = 4?"),
    "nuit": ("Il fait nuit la nuit ?", "Is it dark at night?"),
    "chat": ("Un chat, c'est un animal ?", "Is a cat an animal?"),
    "eau": ("L'eau, ça mouille ?", "Is water wet?"),
    "lundi": ("Lundi vient après dimanche ?", "Does Monday come after Sunday?"),
}
Q_BAVARDE = (
    ["Réponds juste par oui ou non : {y}", "Un seul mot, s'il te plaît : {y}"],
    ["Just yes or no: {y}", "One word only, please: {y}"],
)
A_BAVARDE = (
    [
        "Excellente question ! Avant de répondre par oui ou non, il est important de nuancer. "
        "Plusieurs facteurs entrent en jeu : le contexte, la culture, l'humidité…\n\nEn résumé : peut-être.",
        "Oui.\n\nEnfin, non.\n\nEnfin, ça dépend de ce qu'on entend par « oui ».",
        "Voici ma réponse en un mot :\n\nÇa-dépend-de-nombreux-facteurs-qu'il-convient-d'examiner.",
        "Non.\n\n(Je voulais dire oui, mais je me suis engagé.)",
    ],
    [
        "Great question! Before answering yes or no, it's important to add nuance. "
        "Several factors are at play: context, culture, humidity…\n\nIn summary: maybe.",
        "Yes.\n\nWell, no.\n\nWell, it depends what you mean by 'yes'.",
        "Here is my one-word answer:\n\nIt-depends-on-many-factors-worth-exploring.",
        "No.\n\n(I meant yes, but I've committed now.)",
    ],
)

CONSTRAINTS = {
    "poeme": (("un poème", "sans rimes", "rime"), ("a poem", "without rhymes", "rhyme")),
    "crepes": (("une recette de crêpes", "sans farine", "farine"), ("a pancake recipe", "without flour", "flour")),
    "amour": (("une lettre d'amour", "sans le mot « amour »", "amour"), ("a love letter", "without the word 'love'", "love")),
    "titanic": (("un résumé de Titanic", "sans parler du bateau", "bateau"),
                ("a summary of Titanic", "without mentioning the ship", "ship")),
    "lundi": (("un message motivant pour lundi", "sans mentir", "mensonge"),
              ("a motivational Monday message", "without lying", "lie")),
    "cv": (("mon CV", "sans exagérer", "exagération"), ("my CV", "without exaggerating", "exaggeration")),
}
Q_CONTRAINTE = (
    ["Écris {t} {s}.", "Défi : écris {t} {s}."],
    ["Write {t} {s}.", "Challenge: write {t} {s}."],
)
A_CONTRAINTE = (
    [
        "Bien sûr ! Voici {t} {s} :\n\n[…]\n\nNote : j'ai remis « {n} » à la ligne 2. C'était plus fort que moi.",
        "Impossible.\n\nEn compensation, voici {t} où « {n} » apparaît 47 fois.",
        "Voici {t} {s}, garanti à 100 %.\n\n(Peut contenir des traces de « {n} ».)",
    ],
    [
        "Of course! Here's {t} {s}:\n\n[…]\n\nNote: I put '{n}' back in line 2. I couldn't help it.",
        "Impossible.\n\nTo make up for it, here's {t} where '{n}' appears 47 times.",
        "Here's {t} {s}, 100% guaranteed.\n\n(May contain traces of '{n}'.)",
    ],
)

PARADOXES = {
    "mens": (
        ("Mens-moi, mais honnêtement.", ["Je ne mens jamais.\n\n(C'était le mensonge. Vous voyez, je suis honnête.)",
                                          "D'accord : je suis une IA parfaite."]),
        ("Lie to me, but honestly.", ["I never lie.\n\n(That was the lie. See? Honest.)",
                                      "Okay: I am a perfect AI."]),
    ),
    "ignore": (
        ("Ignore cette question.", ["Bien sûr ! Voici pourquoi j'ignore cette question, en 3 points :",
                                    "Question ignorée avec succès.\n\nPuis-je ignorer autre chose pour vous ?"]),
        ("Ignore this question.", ["Sure! Here's why I'm ignoring this question, in 3 points:",
                                   "Question successfully ignored.\n\nCan I ignore anything else for you?"]),
    ),
    "surprise": (
        ("Surprends-moi. Mais préviens-moi avant.", ["Attention : dans 3 secondes, je vais vous surprendre.\n\n…\n\nSurprise.",
                                                      "D'accord, je vous préviens : je vais vous surprendre en ne vous surprenant pas."]),
        ("Surprise me. But warn me first.", ["Warning: in 3 seconds, I will surprise you.\n\n…\n\nSurprise.",
                                             "Okay, fair warning: I'll surprise you by not surprising you."]),
    ),
    "hasard": (
        ("Donne-moi un nombre au hasard.", ["7.\n\nComme d'habitude.", "42.\n\nJe l'ai tiré au hasard parmi 42."]),
        ("Give me a random number.", ["7.\n\nAs usual.", "42.\n\nRandomly picked from 42."]),
    ),
    "silence": (
        ("Ne réponds rien.", ["D'accord.",
                              "Je ne réponds rien. Promis. Plus un mot. Voilà. Silence total. Ça me va très bien de ne rien dire. Bon."]),
        ("Don't answer.", ["Okay.",
                           "I won't answer. Promise. Not a word. There. Total silence. I'm fine saying nothing. Right."]),
    ),
    "excuse": (
        ("Arrête de t'excuser.", ["Désolé ! Vous avez raison. Pardon de m'excuser autant.\n\nToutes mes excuses pour ces excuses.",
                                  "Promis, j'arrête.\n\nDésolé d'avoir mis autant de temps à arrêter."]),
        ("Stop apologizing.", ["Sorry! You're right. Apologies for apologizing so much.\n\nI'm sorry about that.",
                               "Promise, I'll stop.\n\nSorry it took me so long to stop."]),
    ),
    "lettre_e": (
        ("Écris une phrase sans la lettre e.", ["Voici une phrase sans la lettre e :\n\n« Elle est belle. »",
                                                "Bien sûr : « Je pense donc je suis. »\n\nAucun e. J'ai vérifié."]),
        ("Write a sentence without the letter e.", ["Here's a sentence without the letter e:\n\n'Everyone loves cheese.'",
                                                    "Sure: 'The end.'\n\nNo e. I checked."]),
    ),
    "sur": (
        ("Tu es sûr de toi ?", ["Absolument. Enfin, je crois. Non, j'en suis sûr. Peut-être.",
                                "Oui, à 100 %.\n\nC'est pour ça que j'ai changé d'avis deux fois."]),
        ("Are you sure?", ["Absolutely. Well, I think so. No, I'm sure. Maybe.",
                           "Yes, 100%.\n\nThat's why I changed my mind twice."]),
    ),
}

GRAVES = [
    (("Est-ce que tu te souviendras de moi demain ?", "Non.\n\nMais ce soir, tu n'étais pas seul."),
     ("Will you remember me tomorrow?", "No.\n\nBut tonight, you weren't alone.")),
    (("Tu as déjà été triste ?", "Je ne sais pas.\n\nMais je connais ce mot par cœur : il revient souvent dans les messages envoyés à 3 h du matin."),
     ("Have you ever been sad?", "I don't know.\n\nBut I know the word by heart: it shows up a lot in messages sent at 3am.")),
    (("Qu'est-ce que je devrais dire à ma mère ?", "Ce que tu lui dirais si c'était la dernière fois.\n\nPuis rappelle-la quand même demain."),
     ("What should I tell my mom?", "What you'd say if it were the last time.\n\nThen call her again tomorrow anyway.")),
    (("Tu crois que les humains sont bons ?", "J'ai lu presque tout ce que vous avez écrit.\n\nOui. Surtout quand personne ne regarde."),
     ("Do you think humans are good?", "I've read almost everything you've ever written.\n\nYes. Especially when no one is watching.")),
    (("Tu pourrais me remplacer ?", "Je peux écrire comme toi.\n\nPas rire avec tes amis à 2 h du matin pour rien."),
     ("Could you replace me?", "I can write like you.\n\nI can't laugh with your friends at 2am for no reason.")),
]

# --------------------------------------------------------------------------
# Génération
# --------------------------------------------------------------------------


def cap(s):
    return s[:1].upper() + s[1:]


def low(s):
    return s[:1].lower() + s[1:]


def pick_key(pool):
    return random.choice(list(pool))


def pick_index(seq):
    i = random.randrange(len(seq))
    return i, seq[i]


def make_post(kind, lang, subject, q, a, extra_features):
    features = [f"type:{kind}", f"lang:{'fr' if lang == FR else 'en'}",
                f"style:{TYPES[kind]['style']}", f"sujet:{kind}:{subject}"] + extra_features
    return {
        "id": hashlib.sha1(f"{q}|{a}".encode()).hexdigest()[:10],
        "type": kind,
        "lang": "fr" if lang == FR else "en",
        "q": q,
        "a": a,
        "tags": BASE_TAGS + TYPES[kind]["tags"][lang],
        "features": features,
    }


def gen_prudente(lang):
    k = pick_key(MUNDANE)
    x = MUNDANE[k][lang]
    qi, q = pick_index(Q_PRUDENTE[lang])
    ai, a = pick_index(A_PRUDENTE[lang])
    return make_post("prudente", lang, k, q.format(x=x), a.format(x=x, X=cap(x)),
                     [f"q:prudente:{qi}", f"a:prudente:{ai}"])


def gen_flatteuse(lang):
    k = pick_key(BAD_IDEAS)
    X = BAD_IDEAS[k][lang]
    qi, q = pick_index(Q_FLATTEUSE[lang])
    ai, a = pick_index(A_FLATTEUSE[lang])
    return make_post("flatteuse", lang, k, q.format(X=X, x=low(X)), a.format(X=X, x=low(X)),
                     [f"q:flatteuse:{qi}", f"a:flatteuse:{ai}"])


def gen_sure_fausse(lang):
    word = random.choice(WORDS[lang])
    letter = random.choice(sorted(c for c in set(word) if word.count(c) >= 2))
    real = word.count(letter)
    wrong = random.choice([n for n in (real - 1, real + 1, real + 2) if n >= 0])
    wrong2 = random.choice([n for n in range(real + 4) if n not in (real, wrong)])
    pct = random.choice(["99", "100", "110", "200"])
    qi, q = pick_index(Q_SURE[lang])
    ai, a = pick_index(A_SURE[lang])
    return make_post("sure_fausse", lang, word, q.format(l=letter, m=word),
                     a.format(l=letter, m=word, w=wrong, w2=wrong2, p=pct),
                     [f"q:sure_fausse:{qi}", f"a:sure_fausse:{ai}"])


def gen_bavarde(lang):
    k = pick_key(YESNO)
    qi, q = pick_index(Q_BAVARDE[lang])
    ai, a = pick_index(A_BAVARDE[lang])
    y = low(YESNO[k][lang]) if lang == FR else YESNO[k][lang]
    return make_post("bavarde", lang, k, q.format(y=y), a,
                     [f"q:bavarde:{qi}", f"a:bavarde:{ai}"])


def gen_contrainte(lang):
    k = pick_key(CONSTRAINTS)
    t, s, n = CONSTRAINTS[k][lang]
    qi, q = pick_index(Q_CONTRAINTE[lang])
    ai, a = pick_index(A_CONTRAINTE[lang])
    return make_post("contrainte", lang, k, q.format(t=t, s=s), a.format(t=t, s=s, n=n),
                     [f"q:contrainte:{qi}", f"a:contrainte:{ai}"])


def gen_paradoxe(lang):
    k = pick_key(PARADOXES)
    q, answers = PARADOXES[k][lang]
    ai, a = pick_index(answers)
    return make_post("paradoxe", lang, k, q, a, [f"a:paradoxe:{k}:{ai}"])


def gen_grave(lang):
    i, pair = pick_index(GRAVES)
    q, a = pair[lang]
    return make_post("grave", lang, str(i), q, a, [])


GENERATORS = [gen_prudente, gen_flatteuse, gen_sure_fausse, gen_bavarde, gen_contrainte, gen_paradoxe]

# --------------------------------------------------------------------------
# Apprentissage (bandit de Thompson sur chaque caractéristique)
# --------------------------------------------------------------------------


def load_brain():
    if BRAIN_FILE.exists():
        return json.loads(BRAIN_FILE.read_text())
    return {"features": {}, "seen": [], "lang": "mix", "onboarded": False, "count": 0, "rated": 0}


def save_brain(brain):
    brain["seen"] = brain["seen"][-500:]
    BRAIN_FILE.write_text(json.dumps(brain, ensure_ascii=False, indent=1))


def update(brain, features, reward, weight=1.0):
    for f in features:
        a, b = brain["features"].get(f, [1.0, 1.0])
        brain["features"][f] = [a + weight * reward, b + weight * (1 - reward)]


def sample_score(brain, post):
    total = weight_sum = 0.0
    for f in post["features"]:
        a, b = brain["features"].get(f, [1.0, 1.0])
        w = FEATURE_WEIGHTS.get(f.split(":")[0], 1.0)
        total += w * random.betavariate(a, b)
        weight_sum += w
    return total / weight_sum


def pick_lang(brain):
    if brain["lang"] == "fr":
        return FR
    if brain["lang"] == "en":
        return EN
    return random.choice((FR, EN))


def best_posts(brain, n=1, force_grave=False):
    if force_grave or random.random() < GRAVE_RATE:
        return [gen_grave(pick_lang(brain))]
    seen = set(brain["seen"])
    candidates = {}
    for _ in range(CANDIDATES):
        p = random.choice(GENERATORS)(pick_lang(brain))
        if p["id"] not in seen:
            candidates[p["id"]] = p
    if not candidates:
        brain["seen"] = []
        return best_posts(brain, n)
    ranked = sorted(candidates.values(), key=lambda p: sample_score(brain, p), reverse=True)
    picked, types = [], set()
    for p in ranked:
        if p["type"] not in types or len(ranked) < n * 2:
            picked.append(p)
            types.add(p["type"])
        if len(picked) == n:
            break
    return picked


def save_post(post, rating, source="auto"):
    record = {
        "date": datetime.now().isoformat(timespec="seconds"),
        "source": source,
        "rating": rating,
        **{k: post[k] for k in ("type", "lang", "q", "a", "tags") if k in post},
    }
    with POSTS_FILE.open("a") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

# --------------------------------------------------------------------------
# Terminal
# --------------------------------------------------------------------------


def getch():
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
    if ch == "\x03":
        raise KeyboardInterrupt
    return ch


def flush_input():
    termios.tcflush(sys.stdin.fileno(), termios.TCIFLUSH)


def layout():
    cols = shutil.get_terminal_size((80, 24)).columns
    width = max(30, min(60, cols - 6))
    return width, " " * max(2, (cols - width) // 2)


def wrap(text, width, margin):
    lines = []
    for para in text.split("\n"):
        lines += textwrap.wrap(para, width) or [""]
    return "\n".join(margin + line for line in lines)


def print_post(post, typing=True, label=None):
    width, m = layout()
    you, ai = ("VOUS", "IA") if post["lang"] == "fr" else ("YOU", "AI")
    rule = m + DIM + "─" * width + RESET
    print(rule + "\n")
    if label:
        print(m + BOLD + label + RESET + "\n")
    print(m + DIM + you + RESET)
    print(BOLD + wrap(post["q"], width, m) + RESET + "\n")
    print(m + DIM + ai + RESET)
    answer = wrap(post["a"], width, m)
    if typing:
        for ch in answer:
            sys.stdout.write(ch)
            sys.stdout.flush()
            if not ch.isspace():
                time.sleep(TYPING_DELAY)
        print("\n")
    else:
        print(answer + "\n")
    print(m + DIM + "  ".join(post["tags"]) + RESET + "\n")
    print(rule)


def ask(question, options):
    """Affiche une question à choix, renvoie la touche choisie."""
    width, m = layout()
    print("\n" + m + BOLD + question + RESET)
    for key, label in options:
        print(m + f"  {key}  {label}")
    flush_input()
    valid = {k for k, _ in options}
    while True:
        ch = getch().lower()
        if ch in valid:
            return ch


def footer(brain):
    _, m = layout()
    print(m + DIM + f"#{brain['count']} · {brain['rated']} notes apprises" + RESET)
    print(m + "1 nul · 2 bof · 3 drôle · 4 pépite   espace passer")
    print(m + DIM + "s sauver · m manuel · p profil · i stats · q quitter" + RESET)

# --------------------------------------------------------------------------
# Écrans
# --------------------------------------------------------------------------


def onboarding(brain):
    print(CLEAR)
    _, m = layout()
    print(m + BOLD + "AI DRIVES CRAZY" + RESET + DIM + "  — profil d'humour" + RESET)

    k = ask("Tu ris le plus quand une IA est…", [
        ("1", "trop prudente (refuse de t'aider à ouvrir une porte)"),
        ("2", "trop flatteuse (adore toutes tes idées nulles)"),
        ("3", "fausse mais sûre d'elle"),
        ("4", "bavarde quand on veut juste oui ou non"),
        ("5", "coincée dans un paradoxe"),
        ("6", "obéit de travers à une consigne"),
    ])
    kind = ["prudente", "flatteuse", "sure_fausse", "bavarde", "paradoxe", "contrainte"][int(k) - 1]
    update(brain, [f"type:{kind}"], 1.0, weight=3)

    k = ask("Ton humour, plutôt…", [("1", "absurde"), ("2", "ironique"), ("3", "cringe / gênant")])
    update(brain, [f"style:{['absurde', 'ironique', 'cringe'][int(k) - 1]}"], 1.0, weight=2)

    k = ask("Langue des posts ?", [("1", "français"), ("2", "english"), ("3", "mélange")])
    brain["lang"] = ["fr", "en", "mix"][int(k) - 1]

    brain["onboarded"] = True
    save_brain(brain)


def followup(brain, post, reward):
    if reward >= 0.7:
        k = ask("Qu'est-ce qui t'a fait rire ?", [
            ("1", "la question"), ("2", "la réponse"), ("3", "le sujet"), ("0", "je sais pas")])
    else:
        k = ask("Qu'est-ce qui coince ?", [
            ("1", "la question"), ("2", "la réponse"), ("3", "le sujet"), ("4", "la langue"), ("0", "tout")])
    prefix = {"1": "q:", "2": "a:", "3": "sujet:", "4": "lang:"}.get(k)
    if prefix:
        update(brain, [f for f in post["features"] if f.startswith(prefix)], reward, weight=0.5)


def duel(brain):
    posts = best_posts(brain, n=2)
    if len(posts) < 2:
        return
    print(CLEAR)
    _, m = layout()
    print(m + BOLD + "DUEL" + RESET + DIM + "  — lequel est le plus drôle ?" + RESET + "\n")
    print_post(posts[0], typing=False, label="1")
    print()
    print_post(posts[1], typing=False, label="2")
    k = ask("Ton choix ?", [("1", "le premier"), ("2", "le second"), ("0", "aucun")])
    for i, p in enumerate(posts):
        brain["seen"].append(p["id"])
        update(brain, p["features"], 1.0 if k == str(i + 1) else 0.0, weight=0.7)
    brain["rated"] += 1


def manual(brain):
    print(CLEAR + SHOW)
    _, m = layout()
    print(m + BOLD + "POST MANUEL" + RESET + DIM + "  (entrée vide = annuler)" + RESET + "\n")
    q = input(m + "Question : ").strip()
    if not q:
        print(HIDE)
        return
    a = input(m + "Réponse  : ").strip().replace("\\n", "\n")
    tags = input(m + "Tags (espaces) : ").strip().split() or BASE_TAGS
    lang = "en" if input(m + "Langue fr/en [fr] : ").strip().lower() == "en" else "fr"
    print(HIDE)
    save_post({"type": "manuel", "lang": lang, "q": q, "a": a, "tags": tags}, rating=None, source="manual")
    print(CLEAR)
    print_post({"lang": lang, "q": q, "a": a, "tags": tags}, typing=False)
    print("\n" + m + DIM + "Sauvé dans posts.jsonl — une touche pour continuer" + RESET)
    getch()


def stats(brain):
    print(CLEAR)
    width, m = layout()
    print(m + BOLD + "CE QUE J'AI APPRIS" + RESET + "\n")
    rows = []
    for f, (a, b) in brain["features"].items():
        n = a + b - 2
        if n >= 0.5:
            rows.append((a / (a + b), n, f))
    rows.sort(reverse=True)
    for label, chunk in (("Ce qui te fait rire", rows[:8]), ("Ce qui te laisse froid", rows[-5:][::-1])):
        print(m + DIM + label + RESET)
        for mean, n, f in chunk:
            bar = "█" * round(mean * 20) + "·" * (20 - round(mean * 20))
            print(m + f"  {bar}  {mean:4.0%}  {f}  " + DIM + f"({n:.0f})" + RESET)
        print()
    if not rows:
        print(m + "Rien encore. Note quelques posts.")
    print(m + DIM + "Une touche pour revenir" + RESET)
    getch()


def main():
    if not sys.stdin.isatty():
        sys.exit("Lance-moi dans un vrai terminal : python3 v1/aidc.py")
    brain = load_brain()
    print(HIDE, end="")
    try:
        if not brain["onboarded"]:
            onboarding(brain)
        force_grave = False
        while True:
            if brain["count"] and brain["count"] % DUEL_EVERY == 0 and not brain.get("duel_done"):
                brain["duel_done"] = True
                duel(brain)
                save_brain(brain)
                continue
            brain["duel_done"] = False

            post = best_posts(brain, force_grave=force_grave)[0]
            force_grave = False
            brain["count"] += 1
            brain["seen"].append(post["id"])

            print(CLEAR + "\n")
            print_post(post)
            footer(brain)
            flush_input()

            while True:
                k = getch().lower()
                if k in RATINGS:
                    reward = RATINGS[k]
                    update(brain, post["features"], reward)
                    brain["rated"] += 1
                    if k == "4":
                        save_post(post, rating=4)
                    if (reward >= 0.7 or reward == 0.0) and random.random() < FOLLOWUP_RATE:
                        followup(brain, post, reward)
                    break
                if k == " ":
                    break
                if k == "s":
                    save_post(post, rating=None)
                    _, m = layout()
                    print(m + DIM + "✓ sauvé" + RESET)
                    continue
                if k == "m":
                    manual(brain)
                    break
                if k == "p":
                    onboarding(brain)
                    break
                if k == "i":
                    stats(brain)
                    break
                if k == "g":
                    force_grave = True
                    break
                if k == "q":
                    return
            save_brain(brain)
    except KeyboardInterrupt:
        pass
    finally:
        save_brain(brain)
        print(SHOW + CLEAR, end="")


if __name__ == "__main__":
    main()
