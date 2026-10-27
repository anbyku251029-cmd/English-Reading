export interface ChapterItem {
  chapterNumber: number;
  chapter: string;
  tagline: string;
  passage: string;
  starterPrompt: string;
  keyExpressionsPreview: string[];
}

export interface BookPreset {
  id: string;
  dbBookId?: number;
  dbChapterId?: number;
  bookNumber?: number;
  title: string;
  author: string;
  series?: string;
  level: 'Beginner (A2)' | 'Intermediate (B1-B2)' | 'Upper-Intermediate (B2-C1)';
  levelKey: 'beginner' | 'intermediate' | 'advanced';
  chapter: string;
  currentChapterNumber?: number;
  chapters?: ChapterItem[];
  coverGradient: string;
  tagline: string;
  passage: string;
  paragraphs?: { id: number; paragraph_number: number; content: string; char_length: number }[];
  starterPrompt: string;
  keyExpressionsPreview: string[];
}

export const MAGIC_TREE_HOUSE_CHAPTERS: ChapterItem[] = [
  {
    chapterNumber: 1,
    chapter: 'Chapter 1: Into the Woods',
    tagline: '잭과 애니가 숲속에서 신비로운 오두막을 발견하는 모험의 시작',
    passage: `“Help! A monster!” said Annie.
“Yeah, sure,” said Jack. “A real monster in Frog Creek, Pennsylvania.”
“Run, Jack!” said Annie. She ran up the road.
Oh, brother.
This is what he got for spending time with his seven-year-old sister. Annie loved pretend stuff. But Jack was eight and a half. He liked real things.
“Watch out, Jack! The monster’s coming! Race you!”
“No, thanks,” said Jack.
Annie raced alone into the woods.
Jack looked at the sky. The sun was about to set.
“Come on, Annie! It’s time to go home!”
But Annie had disappeared.
Jack waited. No Annie.
“Annie!” he shouted again.
“Jack! Jack! Come here!”
Jack groaned. “This better be good,” he said.
Jack left the road and headed into the woods. The trees were lit with a golden late-afternoon light.
“Come here!” called Annie.
There she was. Standing under a tall oak tree. “Look,” she said. She was pointing at a rope ladder.
The longest rope ladder Jack had ever seen.
“Wow,” he whispered.
The ladder went all the way up to the top of the tree.
There—at the top—was a tree house. It was tucked between two branches.
“That must be the highest tree house in the world,” said Annie.
“Who built it?” asked Jack. “I’ve never seen it before.”
“I don’t know. But I’m going up,” said Annie.
“No. We don’t know who it belongs to,” said Jack.
“Just for a teeny minute,” said Annie. She started up the ladder.
“Annie, come back!”
She kept climbing.
Jack sighed. “Annie, it’s almost dark. We have to go home.”
Annie disappeared inside the tree house.
“An-nie!”
Jack waited a moment. He was about to call again when Annie poked her head out of the tree house window.
“Books!” she shouted.
“What?”
“It’s filled with books!”
Oh, man! Jack loved books.
He pushed his glasses into place. He gripped the sides of the rope ladder, and up he went.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 1장(Into the Woods)이야. 잭과 애니가 숲속에서 트리하우스를 발견하는 장면이야!',
    keyExpressionsPreview: [
      'This is what I get for...',
      'Watch out!',
      'Take a deep breath',
    ],
  },
  {
    chapterNumber: 2,
    chapter: 'Chapter 2: The Monster',
    tagline: '트리하우스 안의 수많은 책들과 창밖으로 나타난 살아있는 프테라노돈',
    passage: `Jack crawled through a hole in the tree house floor.
Wow. The tree house was filled with books. Books everywhere. Very old books with dusty covers. New books with shiny, bright covers.
“Look. You can see far, far away,” said Annie. She was peering out the tree house window.
Jack looked out the window with her. Down below were the tops of the other trees. In the distance he saw the Frog Creek library. The elementary school. The park.
Annie pointed in the other direction.
“There’s our house,” she said.
Sure enough. There was their white wooden house with the green porch. Next door was their neighbor’s black dog, Henry. He looked very tiny.
“Hi, Henry!” shouted Annie.
“Shush!” said Jack. “We’re not supposed to be up here.”
He glanced around the tree house again.
“I wonder who owns all these books,” he said. He noticed bookmarks were sticking out of many of them.
“I like this one,” said Annie. She held up a book with a castle on the cover.
“Here’s a book about Pennsylvania,” said Jack. He turned to the page with the bookmark.
“Hey, there’s a picture of Frog Creek in here,” said Jack. “It’s a picture of these woods!”
“Oh, here’s a book for you,” said Annie. She held up a book about dinosaurs. A blue silk bookmark was sticking out of it.
“Let me see it.” Jack set down his backpack and grabbed the book from her.
“You look at that one, and I’ll look at the one about castles,” said Annie.
“No, we better not,” said Jack. “We don’t know who these books belong to.”
But even as he said this, Jack opened the dinosaur book to where the bookmark was. He couldn’t help himself.
He turned to a picture of an ancient flying reptile. A Pteranodon.
He touched the huge bat-like wings.
“Wow,” whispered Jack. “I wish I could see a Pteranodon for real.”
Jack studied the picture of the odd-looking creature soaring through the sky.
“Ahhh!” screamed Annie.
“What?” said Jack.
“A monster!” Annie cried. She pointed to the tree house window.
“Stop pretending, Annie,” said Jack.
“No, really!” said Annie.
Jack looked out the window.
A giant creature was gliding above the treetops! He had a long, weird crest on the back of his head. A skinny beak. And huge bat-like wings!
It was a real live Pteranodon!
The creature curved through the sky. He was coming straight toward the tree house. He looked like a glider plane!
The leaves trembled.
Suddenly the creature soared up. High into the sky. Jack nearly fell out the window trying to see it.
The wind picked up. It was whistling now.
The tree house started to spin.
“What’s happening?” cried Jack.
“Get down!” shouted Annie.
She pulled him back from the window.
The tree house was spinning. Faster and faster.
Jack squeezed his eyes shut. He held on to Annie.
Then everything was still.
Absolutely still.
Jack opened his eyes. Sunlight slanted through the window. There was Annie. The books. His backpack.
The tree house was still high up in an oak tree. But it wasn’t the same oak tree.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 2장(The Monster)이야. 잭이 공룡 책을 펼치고 하늘에서 진짜 프테라노돈을 목격하며 트리하우스가 회전하는 장면이야!',
    keyExpressionsPreview: [
      'Not supposed to be...',
      'Could not help himself',
      'For real',
    ],
  },
  {
    chapterNumber: 3,
    chapter: 'Chapter 3: Where Is Here?',
    tagline: '백악기 6천5백만 년 전 공룡 세계로 이동한 것을 깨달은 잭과 애니',
    passage: `Jack looked out the window.
He looked down at the picture in the book.
He looked back out the window.
The world outside and the world in the picture—they were exactly the same.
The Pteranodon was soaring through the sky. The ground was covered with ferns and tall grass. There was a winding stream. A sloping hill. And volcanoes in the distance.
“Wh-where are we?” stammered Jack.
The Pteranodon glided down to the base of their tree. The creature coasted to a stop. And stood very still.
“What happened to us?” said Annie. She looked at Jack. He looked at her.
“I don’t know,” said Jack. “I was looking at the picture in the book—”
“And you said, ‘Wow, I wish I could see a Pteranodon for real,’” said Annie.
“Yeah. And then we saw one. In the Frog Creek woods,” said Jack. “Yeah. And then the wind got loud. And the tree house started spinning,” said Annie.
“And we landed here,” said Jack.
“And we landed here,” said Annie.
“So that means...” said Jack.
“So that means... what?” said Annie.
“Nothing,” said Jack. He shook his head. “None of this can be real.”
Annie looked out the window again. “But he’s real,” she said. “He’s very real.”
Jack looked out the window with her. The Pteranodon was standing at the base of the oak tree. Like a guard. His giant wings were spread out on either side of him.
“Hi!” Annie shouted.
“Shush!” said Jack. “We’re not supposed to be here.”
“But where is here?” said Annie.
“I don’t know,” said Jack.
“Hi!” Annie called again to the creature.
The Pteranodon looked up at them.
“Where is here?” Annie called down.
“You’re nuts. He can’t talk,” said Jack. “But maybe the book can tell us.”
Jack looked down at the book. He read the words under the picture:
This flying reptile lived in the Cretaceous period. It vanished 65 million years ago.
No. Impossible. They couldn’t have landed in a time 65 million years ago.
“Jack,” said Annie. “He’s nice.”
“Nice?”
“Yeah, I can tell. Let’s go down and talk to him.”
“Talk to him?”
Annie started down the rope ladder.
“Hey!” shouted Jack.
But Annie kept going.
“Are you crazy?” Jack called.
Annie dropped to the ground. She stepped boldly up to the ancient creature.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 3장(Where Is Here?)이야. 잭과 애니가 6500만 년 전 백악기 공룡 시대로 시간이동한 것을 깨닫는 장면이야!',
    keyExpressionsPreview: [
      'Coasted to a stop',
      'You are nuts',
      'Stepped boldly',
    ],
  },
  {
    chapterNumber: 4,
    chapter: 'Chapter 4: Henry',
    tagline: '프테라노돈을 만지며 교감하는 애니와 연구 노트를 쓰는 잭',
    passage: `Jack gasped as Annie held out her hand.
Oh, brother. She was always trying to make friends with animals. But this was going too far.
“Don’t get too close to him, Annie!” Jack shouted.
But Annie touched the Pteranodon’s crest. She stroked his neck. She was talking to him.
What in the world was she saying?
Jack took a deep breath. Okay. He would go down, too. It would be good to examine the creature. Take notes. Like a scientist.
Jack started down the rope ladder.
When he got to the ground, Jack was only a few feet away from the creature.
The creature stared at Jack. His eyes were bright and alert.
“He’s soft, Jack,” said Annie. “He feels like Henry.”
Jack snorted. “He’s no dog, Annie.”
“Feel him, Jack,” said Annie.
Jack didn’t move.
“Don’t think, Jack. Just do it.”
Jack stepped forward. He put out his arm. Very cautiously. He brushed his hand down the creature’s neck.
Interesting. A thin layer of fuzz covered the Pteranodon’s skin.
“Soft, huh?” said Annie.
Jack reached into his backpack and pulled out a pencil and a notebook.
He wrote:
FUZZY SKIN
“What are you doing?” asked Annie.
“Taking notes,” said Jack. “We’re probably the first people in the whole world to ever see a real live Pteranodon.”
Jack looked at the Pteranodon again. The creature had a bony crest on top of his head. The crest was longer than Jack’s arm.
“I wonder how smart he is,” Jack said.
“Very smart,” said Annie.
“Don’t count on it,” said Jack. “His brain’s probably no bigger than a bean.”
“No, he’s very smart. I can feel it,” said Annie. “I’m going to call him Henry.”
Jack wrote in his notebook:
SMALL BRAIN?
Jack looked at the creature again. “Maybe he’s a mutant,” he said.
The creature tilted his head.
Annie laughed. “He’s no mutant, Jack.”
“Well, what’s he doing here then? Where is this place?” said Jack.
Annie leaned close to the Pteranodon.
“Do you know where we are, Henry?” she asked softly.
The creature fixed his eyes on Annie. His long jaws were opening and closing. Like a giant pair of scissors.
“Are you trying to talk to me, Henry?” asked Annie.
“Forget it, Annie.” Jack wrote in his notebook:
MOUTH LIKE SCISSORS?
“Did we come to a time long ago, Henry?” asked Annie. “Is this a place from long ago?”
Suddenly she gasped. “Jack!”
He looked up.
Annie was pointing toward the hill. On top stood a huge dinosaur!`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 4장(Henry)이야. 애니가 프테라노돈에게 헨리라는 이름을 붙이고 잭이 관찰 노트를 쓰는 장면이야!',
    keyExpressionsPreview: [
      'Going too far',
      'Don’t count on it',
      'What in the world...',
    ],
  },
  {
    chapterNumber: 5,
    chapter: 'Chapter 5: Gold in the Grass',
    tagline: '초식공룡 트리케라톱스를 관찰하고 풀밭에서 의문의 황금 메달을 발견하다',
    passage: `“Go! Go!” said Jack. He threw his notebook into his pack. He pushed Annie toward the rope ladder.
“Bye, Henry!” she said.
“Go!” said Jack. He gave Annie a big push.
“Quit it!” she said. But she started up the ladder. Jack scrambled after her.
They tumbled into the tree house.
They were panting as they looked out the window at the dinosaur. He was standing on the hilltop. Eating flowers off a tree.
“Oh, man,” whispered Jack. “We are in a time long ago!”
The dinosaur looked like a huge rhinoceros. Only he had three horns instead of one. Two long ones above his eyes and one on his nose. He had a big shield-like thing behind his head.
“Triceratops!” said Jack.
“Does he eat people?” whispered Annie.
“I’ll look it up.” Jack grabbed the dinosaur book. He flipped through the pages.
“There!” he said. He pointed to a picture of a Triceratops. He read the caption:
The Triceratops lived in the late Cretaceous period. This plant-eating dinosaur weighed over 12,000 pounds.
Jack slammed the book shut. “Just plants. No meat.”
“Let’s go see him,” said Annie.
“Are you nuts?” said Jack.
“Don’t you want to take notes about him?” asked Annie. “We’re probably the first people in the whole world to ever see a real live Triceratops.”
Jack sighed. She was right.
“Let’s go,” he said.
He shoved the dinosaur book into his pack. He slung it over his shoulder and started down the ladder.
On the way down, Jack stopped.
He called up to Annie, “Just promise you won’t pet him.”
“I promise.”
“Promise you won’t kiss him.”
“I promise.”
“Promise you won’t talk to him.”
“I promise.”
“Promise you won’t—”
“Go! Go!” she said.
Jack went Annie followed.
When they stepped off the ladder, the Pteranodon gave them a kind look.
Annie blew a kiss at him. “Be back soon, Henry,” she said cheerfully.
“Shush!” said Jack. And he led the way through the ferns. Slowly and carefully.
When he reached the bottom of the hill, he kneeled behind a fat bush.
Annie knelt beside him and started to speak.
“Shush!” Jack put his finger to his lips.
Annie made a face.
Jack peeked out at the Triceratops.
The dinosaur was incredibly big. Bigger than a truck. He was eating the flowers off a magnolia tree.
Jack slipped his notebook out of his pack. He wrote:
EATS FLOWERS
Annie nudged him.
Jack ignored her. He studied the Triceratops again. He wrote:
EATS SLOWLY
Annie nudged him hard.
Jack looked at her.
Annie pointed to herself. She walked her fingers through the air. She pointed to the dinosaur. She smiled.
Was she teasing?
She waved at Jack.
Jack started to grab her.
She laughed and jumped away. She fell into the grass. In full view of the Triceratops!
“Get back!” whispered Jack.
Too late. The big dinosaur had spotted Annie. He gazed down at her from the hilltop. Half of a magnolia flower was sticking out of his mouth.
“Oops,” said Annie.
“Get back!” Jack shouted at her.
“He looks nice, Jack.”
“Nice? Watch out for his horns, Annie!”
“No. He’s nice, Jack.”
Nice?
But the Triceratops just gazed calmly down at Annie. Then he turned and loped away. Down the side of the hill.
“Bye!” said Annie. She turned back to Jack. “See?”
Jack grunted. But he wrote in his notebook:
NICE
“Come on. Let’s look around some more,” said Annie.
As Jack started after Annie, he saw something glittering in the tall grass. He reached out and picked it up.
A medallion. A gold medallion.
A letter was engraved on the medallion. A fancy M.
“Oh, man. Someone came here before us,” Jack said softly.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 5장(Gold in the Grass)이야. 거대한 트리케라톱스를 마주하고 풀밭에서 알파벳 M이 새겨진 금메달을 줍는 장면이야!',
    keyExpressionsPreview: [
      'In full view of...',
      'Flipped through the pages',
      'Look around some more',
    ],
  },
  {
    chapterNumber: 6,
    chapter: 'Chapter 6: Dinosaur Valley',
    tagline: '아기 공룡들의 둥지와 거대한 오리주둥이 공룡, 그리고 나타난 T-Rex!',
    passage: `“Annie, look at this!” Jack called. “Look what I found!”
Annie had gone up to the hilltop.
She was busy picking a flower from the magnolia tree.
“Annie, look! A medallion!”
But Annie wasn’t paying attention to Jack. She was staring at something on the other side of the hill.
“Oh, wow!” she said.
“Annie!”
Clutching her magnolia flower, she took off down the hill. “Annie, come back!” Jack shouted.
But Annie had disappeared.
“I’m going to kill her,” Jack muttered.
He stuffed the gold medallion into his jeans pocket.
Then he heard Annie shriek.
“Annie?”
Jack heard another sound as well. A deep, bellowing sound. Like a tuba.
“Jack! Come here!” Annie called.
“Annie!”
Jack grabbed his backpack and raced up the hill.
When he got to the top, he gasped.
The valley below was filled with nests. Big nests made out of mud. And the nests were filled with tiny dinosaurs!
Annie was crouching next to one of the nests. And standing over her was a gigantic duck-billed dinosaur!
“Don’t panic. Don’t move,” said Jack. He stepped slowly down the hill toward Annie.
The huge dinosaur was towering above Annie. Waving her arms. Making her tuba sound.
Jack stopped. He didn’t want to get too close.
He knelt on the ground. “Okay. Move toward me. Slowly,” he said.
Annie started to stand up.
“Don’t stand. Crawl,” said Jack.
Clutching her flower, Annie crawled toward Jack.
The duck-billed dinosaur followed her. Still bellowing.
Annie froze.
“Keep going,” Jack said softly.
Annie started crawling again.
Jack inched farther down the hill. Until he was just an arm’s distance from Annie.
He reached out—and grabbed her hand.
He pulled Annie toward him.
“Stay down,” he said. He crouched next to her. “Bow your head. Pretend to chew.”
“Chew?”
“Yes. I read that’s what you do if a mean dog comes at you.”
“She’s no dog, Jack,” said Annie.
“Just chew,” said Jack.
Jack and Annie both bowed their heads. And pretended to chew.
Soon the dinosaur grew quiet.
Jack raised his head.
“I don’t think she’s mad anymore,” he said.
“Thanks, Jack, for saving me,” said Annie.
“You have to use your brain,” said Jack. “You can’t just go running to a nest of babies. There’s always a mother nearby.”
Annie stood up.
“Annie!”
Too late.
Annie held out her magnolia flower to the dinosaur.
“I’m sorry I made you worry about your babies,” she said.
The dinosaur moved closer to Annie. She grabbed the flower from her. She reached for another.
“No more,” said Annie.
The dinosaur let out a sad tuba sound.
“But there are more flowers up there,” Annie said. She pointed to the top of the hill. “I’ll get you some.”
Annie hurried up the hill.
The dinosaur waddled after her.
Jack quickly examined the babies. Some were crawling out of their nests.
Where were the other mothers?
Jack took out the dinosaur book. He flipped through the pages.
He found a picture of some duck-billed dinosaurs. He read the caption:
The Anatosauruses lived in colonies. While a few mothers babysat the nests, others hunted for food.
So there must be more mothers close by.
“Hey, Jack!” Annie called.
Jack looked up. Annie was at the top of the hill. Feeding magnolia flowers to the giant Anatosaurus!
“She’s nice, too, Jack,” Annie said.
But suddenly the Anatosaurus made her terrible tuba sound. Annie crouched down and started to chew.
The dinosaur barged down the hill.
She seemed afraid of something.
Jack put the book down on top of his pack. He hurried up to Annie.
“I wonder why she ran away,” said Annie. “We were starting to be friends.”
Jack looked around. What he saw in the distance almost made him throw up.
An enormous ugly monster was coming across the plain.
He was walking on two big legs. And swinging a long, thick tail. And dangling two tiny arms.
He had a huge head. And his jaws were wide open.
Even from far away Jack could see his long, gleaming teeth.
“Tyrannosaurus rex!” whispered Jack.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 6장(Dinosaur Valley)이야. 아기 공룡 둥지와 거대한 아나토사우루스를 만나고, 마침내 무시무시한 티라노사우루스가 나타나는 장면이야!',
    keyExpressionsPreview: [
      'Towering above...',
      'Use your brain',
      'Almost made him throw up',
    ],
  },
  {
    chapterNumber: 7,
    chapter: 'Chapter 7: Ready, Set, Go!',
    tagline: '트리하우스로 도망쳤지만 두고 온 배낭을 가지러 다시 질주하는 잭',
    passage: `“Run, Annie! Run!” cried Jack. “To the tree house!”
They dashed down the hill together. Through the tall grass, through the ferns, past the Pteranodon, and right to the rope ladder.
They scrambled up. Seconds later they tumbled into the tree house.
Annie leaped to the window.
“He’s going away!” she said, panting.
Jack pushed his glasses into place. He looked through the window with her.
But then the monster stopped and turned around.
“Duck!” said Jack.
The two of them hunched down.
After a long moment, they raised their heads. They peeked out again. “Coast clear,” said Jack.
“Yay,” whispered Annie.
“We have to get out of here,” said Jack.
“You made a wish before,” said Annie.
“I wish we could go back to Frog Creek,” said Jack.
Nothing happened.
“I wish—”
“Wait. You were looking at a picture in the dinosaur book. Remember?”
The dinosaur book.
Jack groaned. “Oh, no. I left the book and my pack on the hill. I have to go back.”
“Oh, forget it,” said Annie.
“I can’t,” said Jack. “The book doesn’t belong to us. Plus my notebook’s in my pack. With all my notes.”
“Hurry!” said Annie.
Jack hurried down the rope ladder.
He leaped to the ground.
He raced past the Pteranodon, through the ferns, through the tall grass, and up the hill.
He looked down.
There was his pack, lying on the ground. On top of it was the dinosaur book.
But now the valley below was filled with Anatosauruses. All standing guard around the nests.
Where had they been? Did fear of the Tyrannosaurus send them home?
Jack took a deep breath.
Ready! Set! Go!
He charged down the hill. He leaped to his backpack. He scooped it up.
A terrible tuba sound! Another! Another! All the Anatosauruses were bellowing at him.
Jack took off.
He raced up to the hilltop.
He started down the hill.
He stopped.
The Tyrannosaurus rex was back! And he was standing between Jack and the tree house!`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 7장(Ready, Set, Go!)이야. 공룡 책과 배낭을 찾으러 언덕으로 달려갔는데, 티라노사우루스가 앞길을 가로막은 절체절명의 순간이야!',
    keyExpressionsPreview: [
      'Coast clear',
      'Hunched down',
      'Ready! Set! Go!',
    ],
  },
  {
    chapterNumber: 8,
    chapter: 'Chapter 8: A Giant Shadow',
    tagline: '티라노사우루스에게 쫓기는 절체절명의 순간, 날아온 거대한 그림자',
    passage: `Jack jumped behind the magnolia tree.
His heart was beating so fast he could hardly think.
He peeked out at the giant monster. The horrible-looking creature was opening and closing his huge jaws. His teeth were as big as steak knives.
Don’t panic. Think.
Jack peered down at the valley.
Good. The duck-billed dinosaurs were sticking close to their nests.
Good. The monster still didn’t seem to know he was there.
Don’t panic. Think. Think. Maybe there’s information in the book.
Jack opened the dinosaur book. He found Tyrannosaurus rex. He read:
Tyrannosaurus rex was the largest meat-eating land animal of all time. If it were alive today, it would eat a human in one bite.
Great. The book was no help at all.
Okay. He couldn’t hide on the other side of the hill. The Anatosauruses might stampede.
Okay. He couldn’t run to the tree house. The Tyrannosaurus might run faster.
Okay. Maybe he should just wait. Wait for the monster to leave.
Jack peeked around the tree.
The Tyrannosaurus had wandered closer to the hill.
Something caught Jack’s eye. Annie was coming down the rope ladder! Was she nuts? What was she doing?
Jack watched Annie hop off the ladder.
She went straight to the Pteranodon. She was talking to him. She was flapping her arms. She pointed at Jack, at the sky, at the tree house.
She was nuts!
“Go! Go back up the tree!” Jack whispered. “Go!”
Suddenly Jack heard a roar.
The Tyrannosaurus rex was looking in his direction.
Jack hit the ground.
The Tyrannosaurus rex was coming toward the hill.
Jack felt the ground shaking.
Should he run? Crawl back into Dinosaur Valley? Climb the magnolia tree?
Just then a giant shadow covered Jack. He looked up.
The Pteranodon was gliding overhead. The giant creature sailed down toward the top of the hill.
He was coming straight for Jack.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 8장(A Giant Shadow)이야. 나무 뒤에 숨은 잭을 향해 티라노사우루스가 다가오고, 프테라노돈이 날아오는 긴박한 순간이야!',
    keyExpressionsPreview: [
      'Caught someone’s eye',
      'No help at all',
      'Hit the ground',
    ],
  },
  {
    chapterNumber: 9,
    chapter: 'Chapter 9: The Amazing Ride',
    tagline: '프테라노돈의 등에 올라타 백악기 하늘을 날아오른 기적 같은 탈출',
    passage: `The Pteranodon coasted down to the ground.
He stared at Jack with his bright, alert eyes.
What was Jack supposed to do? Climb on? “But I’m too heavy,” thought Jack.
Don’t think. Just do it.
Jack looked at the Tyrannosaurus.
He was starting up the hill. His giant teeth were flashing in the sunlight.
Okay. Don’t think. Just do it!
Jack put his book in his pack. Then he eased down onto the Pteranodon’s back.
He held on tightly.
The creature moved forward. He spread out his wings—and lifted off the ground!
They teetered this way. Then that.
Jack nearly fell off.
The Pteranodon steadied himself, then rose into the sky.
Jack looked down. The Tyrannosaurus was chomping the air and staring up at him.
The Pteranodon glided away.
He sailed over the hilltop.
He circled over the valley. Over all the nests filled with babies. Over all the giant duck-billed dinosaurs.
Then the Pteranodon soared out over the plain—over the Triceratops who was grazing in the high grass.
It was amazing! It was a miracle!
Jack felt like a bird. As light as a feather.
The wind was rushing through his hair. The air smelled sweet and fresh. He whooped. He laughed.
Jack couldn’t believe it. He was riding on the back of an ancient flying reptile!
The Pteranodon sailed over the stream, over the ferns and bushes.
Then he carried Jack down to the base of the oak tree.
When they came to a stop, Jack slid off the creature’s back. And landed on the ground.
Then the Pteranodon took off again and glided into the sky.
“Bye, Henry,” whispered Jack.
“Are you okay?” Annie shouted from the tree house.
Jack pushed his glasses into place. He kept staring up at the Pteranodon.
“Jack, are you okay?” Annie called.
Jack looked up at Annie. He smiled.
“Thanks for saving my life,” he said. “That was really fun.”
“Climb up!” said Annie.
Jack tried to stand. His legs were wobbly.
He felt a bit dizzy.
“Hurry!” shouted Annie. “He’s coming!”
Jack looked around. The Tyrannosaurus was heading straight toward him!
Jack bolted to the ladder. He grabbed the sides and started up.
“Hurry! Hurry!” screamed Annie.
Jack scrambled into the tree house.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 9장(The Amazing Ride)이야. 잭이 프테라노돈 헨리의 등에 올라타 하늘을 날며 공룡 계곡을 내려다보는 환상적인 비행 장면이야!',
    keyExpressionsPreview: [
      'As light as a feather',
      'Lifted off the ground',
      'Held on tightly',
    ],
  },
  {
    chapterNumber: 10,
    chapter: 'Chapter 10: Home Before Dark',
    tagline: '펜실베이니아 집으로 무사히 귀환하고 비밀을 간직하게 된 잭과 애니',
    passage: `“He’s coming toward the tree!” Annie cried.
Suddenly something slammed against the oak tree. The tree house shook like a leaf.
Jack and Annie tumbled into the books.
“Make a wish!” cried Annie.
“We need the book! The one with the picture of Frog Creek!” said Jack. “Where is it?”
He pushed some books aside. He had to find that book about Pennsylvania.
There it was!
He grabbed it and tore through it, looking for the photograph of the Frog Creek woods.
He found it! Jack pointed to the picture.
The wind began to moan. Softly at first.
“Hurry!” Jack yelled.
The wind picked up. It was whistling now.
The tree house started to spin.
It spun faster and faster.
Jack closed his eyes. He held on tightly to Annie. Then everything was still.
Absolutely still.
A bird began to sing.
Jack opened his eyes. He was still pointing at the picture of the Frog Creek woods.
He peeked out the tree house window. Outside he saw the exact same view.
“We’re home,” whispered Annie.
The woods were lit with a golden late-afternoon light. The sun was about to set.
No time had passed since they’d left. “Ja-ack! An-nie!” a voice called from the distance.
“That’s Mom,” said Annie, pointing.
Jack saw their mother far away. She was standing in front of their house. She looked very tiny.
“An-nie! Ja-ack!” she called.
Jack still felt dazed. He just stared at Annie.
“What happened to us?” he said.
“We took a trip in a magic tree house,” said Annie simply.
“But it’s the same time as when we left,” said Jack.
Annie shrugged.
“And how did it take us so far away?” said Jack. “And so long ago?”
“You just looked at a book and said you wished we could go there,” said Annie. “And the magic tree house took us there.”
“But how?” said Jack. “And who built this magic tree house? Who put all these books here?”
A magic person?
“Oh, look,” said Jack. “I almost forgot about this.” He reached into his pocket and pulled out the gold medallion. “Someone lost this back there... in dinosaur land. Look, there’s a letter M on it.”
Annie’s eyes got round. “You think M stands for magic person?” she said.
“I don’t know,” said Jack. “I just know someone went to that place before us.”
“Ja-ack! An-nie!” came the distant cry again.
Annie poked her head out the window. “Come-ing!” she shouted.
Jack put the gold medallion back in his pocket.
He pulled the dinosaur book out of his pack and put it back with all the other books.
Then he and Annie took one last look around the tree house.
“Good-bye, house,” whispered Annie.
Jack slung his backpack over his shoulder. He pointed at the ladder. Annie started down, Jack followed.
Seconds later they hopped onto the ground and started walking out of the woods.
“No one’s going to believe our story,” said Jack.
“Dad won’t believe it,” said Jack.
“He’ll say it was a dream,” said Annie.
“Mom won’t believe it,” said Jack.
“She’ll say it was pretend.”
“My teacher won’t believe it,” said Jack.
“She’ll say you’re nuts,” said Annie.
“We better not tell anyone,” said Jack.
“I already said that,” said Annie.
Jack sighed. “I think I’m starting to not believe it myself,” he said. They left the woods and started up the road toward their house.
As they walked past all the houses on their street, the trip to dinosaur time did seem more and more like a dream.
Only this world and this time seemed real.
Jack reached into his pocket. He clasped the gold medallion.
He felt the engraving of the letter M. It made Jack’s fingers tingle.
Jack laughed. Suddenly he felt very happy.
He couldn’t explain what had happened today. But he knew for sure that their trip in the magic tree house had been real.
Absolutely real.
“Tomorrow,” Jack said softly, “we’ll go back to the woods.”
“Of course,” said Annie.
“And we’ll climb up to the tree house,” said Jack.
“And we’ll see what happens next,” said Jack. “Of course,” said Annie.
“Race you!”
And they took off together, running for home.`,
    starterPrompt: '오늘 읽을 책은 Magic Tree House 마지막 10장(Home Before Dark)이야. 펜실베이니아 집으로 무사히 돌아와 신비로운 M 메달을 품고 내일의 모험을 기약하는 결말 장면이야!',
    keyExpressionsPreview: [
      'Shook like a leaf',
      'No time had passed',
      'Take one last look',
    ],
  },
];

export const PRESET_BOOKS: BookPreset[] = [
  {
    id: 'magic-tree-house-series',
    title: 'Magic Tree House #1: Dinosaurs Before Dark',
    author: 'Mary Pope Osborne',
    series: 'Magic Tree House',
    level: 'Beginner (A2)',
    levelKey: 'beginner',
    chapter: MAGIC_TREE_HOUSE_CHAPTERS[0].chapter,
    currentChapterNumber: 1,
    chapters: MAGIC_TREE_HOUSE_CHAPTERS,
    coverGradient: 'from-amber-600 via-emerald-600 to-teal-800',
    tagline: '잭과 애니의 시공간을 넘나드는 신비로운 모험 이야기 (Chapter 1~10 수록)',
    passage: MAGIC_TREE_HOUSE_CHAPTERS[0].passage,
    starterPrompt: MAGIC_TREE_HOUSE_CHAPTERS[0].starterPrompt,
    keyExpressionsPreview: MAGIC_TREE_HOUSE_CHAPTERS[0].keyExpressionsPreview,
  },
  {
    id: 'the-little-prince-ch21',
    title: 'The Little Prince',
    author: 'Antoine de Saint-Exupéry',
    level: 'Intermediate (B1-B2)',
    levelKey: 'intermediate',
    chapter: 'Chapter 21: The Secret of the Fox',
    coverGradient: 'from-indigo-600 via-sky-600 to-amber-500',
    tagline: '여우와 어린 왕자가 나누는 진정한 관계 맺기(Taming)의 비밀',
    passage: `"Good morning," said the fox.
"Good morning," the little prince replied politely, though when he turned around he saw nothing.
"I am right here," the voice said, "under the apple tree."
"Who are you?" asked the little prince. "You are very pretty to look at."
"I am a fox," the fox said.
"Come and play with me," proposed the little prince. "I am so unhappy."
"I cannot play with you," the fox said. "I am not tamed."
"Ah! Please excuse me," said the little prince.
After some thought, he added, "What does that mean—'tame'?"
"It is an act too often neglected," said the fox. "It means to establish ties."
"To establish ties?"
"Just that," said the fox. "To me, you are still nothing more than a little boy who is just like a hundred thousand other little boys. And I have no need of you. And you, on your part, have no need of me. But if you tame me, then we shall need each other. To me, you will be unique in all the world. To you, I shall be unique in all the world."
"I am beginning to understand," said the little prince.`,
    starterPrompt: '오늘 읽을 책은 어린 왕자 21장, 여우와 관계 맺기에 대해 대화하는 장면이야!',
    keyExpressionsPreview: [
      'Establish ties',
      'Nothing more than...',
      'On your part',
    ],
  },
  {
    id: 'charlottes-web-ch1',
    title: "Charlotte's Web",
    author: 'E.B. White',
    level: 'Intermediate (B1-B2)',
    levelKey: 'intermediate',
    chapter: 'Chapter 1: Before Breakfast',
    coverGradient: 'from-amber-700 via-rose-600 to-indigo-900',
    tagline: '어린 펀(Fern)이 도끼를 든 아빠를 막아서며 새끼 돼지 윌버를 구하는 명장면',
    passage: `"Where's Papa going with that ax?" said Fern to her mother as they were setting the table for breakfast.
"Out to the hoghouse," replied Mrs. Arable. "Some pigs were born last night."
"I don't see why he needs an ax," continued Fern, who was only eight.
"Well," said her mother, "one of the pigs is a runt. It's very small and weak, and it will never amount to anything. So your father has decided to do away with it."
"Do away with it?" shrieked Fern. "You mean kill it? Just because it's smaller than the others?"
Mrs. Arable put a pitcher of cream on the table. "Don't yell, Fern!" she said. "Your father is right. The pig would probably die anyway."
Fern pushed her chair out of the way and ran outdoors. The grass was wet and the earth smelled of springtime. Fern's sneakers were sopping by the time she caught up with her father.
"Please don't kill it!" she sobbed. "It's unfair."
Mr. Arable stopped walking. "Fern," he said gently, "you will have to learn to control yourself."
"This is a matter of life and death," cried Fern, "and you talk about controlling myself!"
Tears ran down her cheeks, and she took hold of the ax and tried to pull it out of her father's hand.`,
    starterPrompt: "오늘 읽을 책은 Charlotte's Web 1장이야. 펀이 아빠에게서 작은 돼지를 지켜내려는 장면이야!",
    keyExpressionsPreview: [
      'Amount to anything',
      'Do away with',
      'A matter of life and death',
    ],
  },
  {
    id: 'wonder-ordinary',
    title: 'Wonder',
    author: 'R.J. Palacio',
    level: 'Intermediate (B1-B2)',
    levelKey: 'intermediate',
    chapter: 'Part 1: Ordinary',
    coverGradient: 'from-sky-500 via-blue-600 to-indigo-800',
    tagline: '평범하지만 평범하지 않은 소년 어기(Auggie)의 진솔하고 따뜻한 고백',
    passage: `I know I'm not an ordinary ten-year-old kid. I mean, sure, I do ordinary things. I eat ice cream. I ride my bike. I play ball. I have an Xbox. Stuff like that makes me ordinary. I guess. And I feel ordinary. Inside.
But I know ordinary kids don't make other ordinary kids run away screaming in playgrounds. I know ordinary kids don't get stared at wherever they go.
If I found a magic lamp and I could have one wish, I would wish that I had a normal face that no one ever noticed at all. I would wish that I could walk down the street without people seeing me and then doing that look-away thing.
Here's what I think: the only reason I'm not ordinary is that no one else sees me that way.
My parents never told me I was weird. They made me feel completely normal at home. But starting fifth grade at a real school for the first time? That was a whole different story.`,
    starterPrompt: '오늘 읽을 책은 Wonder의 시작 부분이야. 어기가 평범함에 대해 독백하는 장면이야!',
    keyExpressionsPreview: [
      'Run away screaming',
      'Get stared at',
      'A whole different story',
    ],
  },
  {
    id: 'harry-potter-ch1',
    title: "Harry Potter and the Sorcerer's Stone",
    author: 'J.K. Rowling',
    level: 'Upper-Intermediate (B2-C1)',
    levelKey: 'advanced',
    chapter: 'Chapter 1: The Boy Who Lived',
    coverGradient: 'from-amber-600 via-purple-700 to-slate-900',
    tagline: '완벽하게 평범하길 원했던 더즐리 가족과 이상한 징조들의 시작',
    passage: `Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much. They were the last people you'd expect to be involved in anything strange or mysterious, because they just didn't hold with such nonsense.
Mr. Dursley was the director of a firm called Grunnings, which made drills. He was a big, beefy man with hardly any neck, although he did have a very large mustache. Mrs. Dursley was thin and blonde and had nearly twice the usual amount of neck, which came in very useful as she spent so much of her time craning over garden fences, spying on the neighbors.
The Dursleys had a small son called Dudley and in their opinion there was no finer boy anywhere.
The Dursleys had everything they wanted, but they also had a secret, and their greatest fear was that somebody would discover it. They didn't think they could bear it if anyone found out about the Potters. Mrs. Potter was Mrs. Dursley's sister, but they hadn't met for several years; in fact, Mrs. Dursley pretended she didn't have a sister, because her sister and her good-for-nothing husband were as unDursleyish as it was possible to be.`,
    starterPrompt: '오늘 읽을 책은 해리포터 1권 1장이야. 더즐리 부부의 기묘한 일상이 시작되는 부분이야!',
    keyExpressionsPreview: [
      'The last person you would expect',
      'Come in useful',
      'Could not bear it',
    ],
  },
];
