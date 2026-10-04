// Offline fallback cards, used when generation is off or a category has no buffered cards yet.
export type Card = { id: string; category: string; value?: number; body: string; reveal?: { afterSeconds: number; body: string } }
export const cards: Card[] = [
 {
  "id": "french-pourtant",
  "category": "french",
  "body": "pourtant\nhowever / yet\n\nIl était fatigué, pourtant il a continué.\nHe was tired, yet he continued."
 },
 {
  "id": "french-besoin",
  "category": "french",
  "body": "avoir besoin de\nto need\n\nJ'ai besoin de plus de temps.\nI need more time."
 },
 {
  "id": "french-rendre-compte",
  "category": "french",
  "body": "se rendre compte (de)\nto realize\n\nJe me suis rendu compte de mon erreur.\nI realized my mistake."
 },
 {
  "id": "french-ca-depend",
  "category": "french",
  "body": "Ça dépend.\nIt depends."
 },
 {
  "id": "french-bientot",
  "category": "french",
  "body": "À bientôt !\nSee you soon!"
 },
 {
  "id": "french-des-que",
  "category": "french",
  "body": "dès que + indicative\nas soon as\n\nAppelle-moi dès que tu arrives.\nCall me as soon as you arrive."
 },
 {
  "id": "french-habitue",
  "category": "french",
  "body": "être habitué à\nto be used to\n\nJe suis habitué au bruit.\nI'm used to the noise."
 },
 {
  "id": "french-recall-habitue",
  "category": "french",
  "value": 2,
  "body": "How would you say:\n“I am used to it.”\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "J'y suis habitué."
  }
 },
 {
  "id": "french-tenir-a",
  "category": "french",
  "body": "tenir à\nto care about / to insist on\n\nJ'y tiens beaucoup.\nIt matters a lot to me."
 },
 {
  "id": "french-du-coup",
  "category": "french",
  "body": "du coup\nso / as a result (casual)\n\nDu coup, on est restés à la maison.\nSo we stayed home."
 },
 {
  "id": "french-y-en",
  "category": "french",
  "body": "il y en a\nthere are some\n\nIl y en a trois dans le frigo.\nThere are three in the fridge."
 },
 {
  "id": "french-avoir-lair",
  "category": "french",
  "body": "avoir l'air + adjective\nto look / seem\n\nTu as l'air fatigué.\nYou look tired."
 },
 {
  "id": "french-plutot",
  "category": "french",
  "body": "plutôt\nrather / fairly\n\nC'est plutôt cher.\nIt's rather expensive."
 },
 {
  "id": "french-manquer",
  "category": "french",
  "value": 2,
  "body": "manquer à\nto be missed by\n\nTu me manques.\nI miss you. (You are missing to me.)"
 },
 {
  "id": "french-recall-retard",
  "category": "french",
  "value": 2,
  "body": "How would you say:\n“I'm running late.”\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "Je suis en retard."
  }
 },
 {
  "id": "french-depuis",
  "category": "french",
  "value": 2,
  "body": "depuis + present\nfor / since (still true)\n\nJ'habite ici depuis deux ans.\nI've lived here for two years."
 },
 {
  "id": "french-quand-meme",
  "category": "french",
  "body": "quand même\nall the same / still\n\nC'est difficile, mais j'essaie quand même.\nIt's hard, but I'm trying anyway."
 },
 {
  "id": "french-faillir",
  "category": "french",
  "value": 2,
  "body": "faillir + infinitive\nto almost do\n\nJ'ai failli tomber.\nI almost fell."
 },
 {
  "id": "french-en-train-de",
  "category": "french",
  "body": "être en train de\nto be in the middle of\n\nJe suis en train de travailler.\nI'm working right now."
 },
 {
  "id": "french-ne-plus",
  "category": "french",
  "body": "ne … plus\nno longer\n\nIl ne fume plus.\nHe doesn't smoke anymore."
 },
 {
  "id": "py-shared-list",
  "category": "python-advanced",
  "value": 2,
  "body": "x = [[]] * 3\nx[0].append(1)\n\nWhat is x?\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "[[1], [1], [1]]\nAll three elements are the same list."
  }
 },
 {
  "id": "py-default-arg",
  "category": "python-advanced",
  "value": 2,
  "body": "def f(a, b=[]):\n    b.append(a)\n    return b\n\nf(1); f(2) returns?\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "[1, 2]\nDefault arguments are evaluated once, at definition time."
  }
 },
 {
  "id": "py-late-binding",
  "category": "python-advanced",
  "value": 2,
  "body": "fs = [lambda: i for i in range(3)]\n[f() for f in fs]\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "[2, 2, 2]\nClosures capture the variable, not its value."
  }
 },
 {
  "id": "py-is-vs-eq",
  "category": "python-advanced",
  "body": "a = 256; b = 256\na is b  # usually True\n\n`is` compares identity, `==` compares value.\nNever use `is` for numbers or strings."
 },
 {
  "id": "py-dict-order",
  "category": "python-advanced",
  "body": "dict preserves insertion order\n(guaranteed since Python 3.7).\n\nUpdating an existing key keeps its position."
 },
 {
  "id": "py-gen-once",
  "category": "python-advanced",
  "body": "g = (x*x for x in range(3))\nlist(g); list(g)\n\nSecond call returns?\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "[]\nGenerators are exhausted after one pass."
  }
 },
 {
  "id": "py-slots",
  "category": "python-advanced",
  "body": "__slots__ removes the per-instance __dict__.\n\nLess memory, faster attribute access,\nbut no arbitrary new attributes."
 },
 {
  "id": "py-walrus",
  "category": "python-advanced",
  "body": "if (n := len(xs)) > 10:\n    print(n)\n\n:= assigns inside an expression."
 },
 {
  "id": "py-asyncio-gather",
  "category": "python-advanced",
  "body": "await asyncio.gather(a(), b())\n\nRuns both concurrently on one thread.\nCPU-bound work still blocks the loop."
 },
 {
  "id": "py-functools-cache",
  "category": "python-advanced",
  "body": "@functools.cache\ndef fib(n): ...\n\nMemoizes by arguments (must be hashable)."
 },
 {
  "id": "pt-mean-shape",
  "category": "ml-general",
  "body": "x = torch.randn(32, 128)\nx.mean(dim=1).shape\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "torch.Size([32])"
  }
 },
 {
  "id": "pt-keepdim",
  "category": "ml-general",
  "value": 2,
  "body": "x = torch.randn(32, 128)\nx.sum(dim=1, keepdim=True).shape\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "torch.Size([32, 1])\nkeepdim keeps the reduced axis as size 1."
  }
 },
 {
  "id": "pt-broadcast",
  "category": "ml-general",
  "body": "a: (8, 1, 5)   b: (3, 1)\n(a + b).shape\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "torch.Size([8, 3, 5])\nShapes align from the right; size-1 dims broadcast."
  }
 },
 {
  "id": "pt-no-grad",
  "category": "ml-general",
  "body": "torch.no_grad()\n\nStops autograd from recording operations\ninside the context.\nUse it for inference and evaluation."
 },
 {
  "id": "pt-inference-mode",
  "category": "ml-general",
  "body": "torch.inference_mode()\n\nLike no_grad, but faster: tensors also skip\nversion counting and can't be used in autograd later."
 },
 {
  "id": "pt-view-vs-reshape",
  "category": "ml-general",
  "value": 2,
  "body": "view() needs compatible strides and shares storage.\nreshape() copies only if it must.\n\nAfter transpose(), prefer reshape()\nor call .contiguous() first."
 },
 {
  "id": "pt-cpu-gpu-copies",
  "category": "ml-general",
  "body": "Moving tensors CPU → GPU repeatedly in a tight loop\ncan dominate runtime.\n\nBatch transfers; use pin_memory + non_blocking=True."
 },
 {
  "id": "pt-zero-grad",
  "category": "ml-general",
  "body": "optimizer.zero_grad(set_to_none=True)\n\nFreeing grads instead of zero-filling them\nsaves memory and a kernel launch."
 },
 {
  "id": "pt-detach",
  "category": "ml-general",
  "body": "y = x.detach()\n\nShares storage with x but is cut from the graph.\nIn-place edits to y also change x."
 },
 {
  "id": "pt-eval-mode",
  "category": "ml-general",
  "value": 2,
  "body": "model.eval()\n\nSwitches dropout and batch norm to inference behavior.\nIt does NOT disable gradients — pair with no_grad()."
 },
 {
  "id": "llm-tokens",
  "category": "llm",
  "body": "Tokens\nModels read tokens, not characters.\n~4 English chars ≈ 1 token."
 },
 {
  "id": "llm-temperature",
  "category": "llm",
  "body": "Temperature\nLow = predictable, high = varied.\nIt rescales logits before softmax."
 },
 {
  "id": "llm-context",
  "category": "llm",
  "body": "Context window\nEverything the model can see at once:\nprompt + history + its own output."
 },
 {
  "id": "llm-kv-cache",
  "category": "llm",
  "body": "KV cache\nStores past keys/values so each new\ntoken costs one step, not a re-read."
 },
 {
  "id": "llm-rag",
  "category": "llm",
  "body": "RAG\nRetrieve relevant text, put it in the prompt,\nthen generate. Fresh facts without retraining."
 },
 {
  "id": "llm-recall-hallu",
  "category": "llm",
  "value": 2,
  "body": "Why do LLMs hallucinate?\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "They predict plausible text, not verified facts; nothing forces a ‘don’t know’."
  }
 },
 {
  "id": "llm-lora",
  "category": "llm",
  "body": "LoRA\nTrain small low-rank adapters instead of\nall weights: cheap fine-tuning."
 },
 {
  "id": "llm-recall-attn",
  "category": "llm",
  "body": "What does attention compute?\n\nThink for a moment…",
  "reveal": {
   "afterSeconds": 6,
   "body": "A weighted mix of value vectors; weights come from query·key similarity."
  }
 }
]
