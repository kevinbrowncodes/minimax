# A scene anchor that held its set

The paragraph below was written for the owner's `01.jpg` (a posing-trunks studio shot) and put at the top of every script of three 30 s chains generated on 2026-09-14/15 (MiniMax-H3 FL2VA, `int8_convrot`, ComfyUI 0.35.1). With it, and with the prompt in MiniMax's format, the set held in 9 of 10 draws; the same scripts without it had changed set or framing in 3 of 5 the day before. It is `docs/scripts/scene.txt` in the repo.

```text
A fit young man in his early twenties with short, tousled light-brown hair and a clean-shaven face, bare-chested and barefoot, wearing only small navy-blue posing trunks, stands centre frame on a black studio floor. Behind him a floor-to-ceiling curtain of black sequins glitters under hard white light. Two studio floodlights on tall black stands flank the frame at the far left and far right, each throwing a bright white glare onto the curtain. In front of him, low across the floor, runs a barrier of four white stanchions with white chains slung between them. Medium-wide shot at eye level, his whole body in frame, the camera on a tripod, dead still.
```

Its order is the skill's order: the subject (age, hair, face, what he wears), then the set from behind him outward (curtain, lights, barrier), each object with colour and material and position, then the light, then the framing and the camera. It names nothing that is not in the picture and describes no action — the scripts do that.

Two lessons from the runs since:

- **Say what the frame does not show if the action will reveal it.** A later image was cropped at the waist; the anchor named the trunks below the crop, and the model still rendered the subject without them in two of two draws. Text lowers the odds of a wrong guess; a frame that shows the thing removes the guess.
- **The camera sentence must not contradict the script.** "The camera on a tripod, dead still" is right for a static shot; for a script that zooms or pushes in, end the anchor at "the camera on a tripod" and put the move in the camera sentence at the top of the prompt.
