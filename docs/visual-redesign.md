# Visual redesign decision record

6 October 2026. Scope: presentation only; generation, auth, tenant, curation and publication behavior stay intact.

## Before review

The live desktop landing page gives half its first viewport to a large abstract F while showing no real imagery. The populated project cards are small against a wide canvas. The creation panel places reference upload and three presets before the prompt, so the prompt and Generate button fall below the first desktop and phone viewport. Storyboard frames have useful images but read as equal form cards, while the public story consumes excessive vertical space.

## Decisions

1. Use licensed public-domain editorial photography on the public page, labeled as an illustrative visual rather than an AI result. Private project images remain on authorized project routes only.
2. Give work areas a tighter header, wider media cards, a compact, sticky creation panel, and the primary Generate action immediately below the prompt. Optional reference and prompt directions remain visible as disclosures.
3. Use consistent charcoal layers, quiet borders, lime only for primary and selected states, and a restrained display scale. Project covers fill their cards; the fallback is an intentional typographic cover.
4. Present a storyboard as a sequence of larger frames with captions and controls in a separate footer. The public story uses a compact editorial grid on desktop and a single column on mobile.

## Deliberate cuts

No new model controls, generation calls, animations that obscure work, sample outputs presented as user results, or backend changes. Existing Clerk components retain their supported appearance configuration.

## Public image provenance

The two public entry photographs are CC0 works hosted by Wikimedia Commons: [Chateau Frontenac at dusk in Quebec City](https://commons.wikimedia.org/wiki/File:Chateau_Frontenac_at_dusk_in_Quebec_City.jpg) and [Petit Champlain at night, Quebec city](https://commons.wikimedia.org/wiki/File:Petit_Champlain_at_night,_Quebec_city.jpg). They illustrate visual direction only and are not represented as Framehouse-generated images. Source license metadata was checked through the Commons API on 6 October 2026.
