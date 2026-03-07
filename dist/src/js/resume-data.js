/**
 * Resume Data
 * Single source of truth for resume content and narrations.
 */

export const resumeData = [
  {
    id: "header-name",
    type: "h1",
    text: "Rob Higgins",
    narration: {
      third: "I present to you Rob Higgins. ... Welcome to Rob's voice guided resume... You are currently listening to one of Rob's *References*, a cloned voice running through Rob's local chatterbox T.T.S. server, then saved as audio files. feel Free to select a different voice to hear from other references, or directly from Rob himself.  If you get bored easily, to help pass the time you can play with the audio Speech Effects like reverb, distortion, chorus, and phaser... So without further ado... ...",
      first: "Hi! I'm Rob Higgins, Welcome to my voice guided resume... You are currently listening to my cloned voice running through my local chatterbox T.T.S. server, then saved as audio files. feel Free to select a different voice to hear from my references.  If you get bored easily, to help pass the time you can play with the audio Speech Effects like reverb, distortion, chorus, and phaser..."
    }
  },
  {
    id: "section-experience",
    type: "h2",
    text: "EXPERIENCE (past 10 years)",
    narration: {
      third: "Rob is a builder with decades of experience shaping the digital world.",
      first: "So, I've been building and shaping the digital world for decades."
    }
  },
  {
    id: "exp-panorama-head",
    type: "experience",
    company: "Panorama AI",
    role: "Head of Engineering",
    date: "Oct 2024 - Feb 2026 · 1 yr 5 mos",
    dateNarration: {
      third: "which he dutifully executed for one year and five months.",
      first: "for one year and five months."
    },
    titleNarration: {
      third: "Rob's most recent work experience was Head of Engineering for Panorama AI",
      first: "My most recent work experience was Head of Engineering for Panorama AI"
    },
    bullets: [
      {
        text: "Steer large-scale technical initiatives, aligning engineering efforts with business objectives.",
        narration: {
          third: "At Panorama, Rob steered large-scale technical initiatives, aligning engineering efforts with business objectives.",
          first: "At Panorama, I steered large-scale technical initiatives, aligning engineering efforts with business objectives."
        }
      },
      {
        text: "Drive strategic planning and technical decision-making.",
        narration: {
          third: "...while driving strategic planning and technical decision-making across the organization.",
          first: "...while driving strategic planning and technical decision-making across the organization."
        }
      },
      {
        text: "Established architectural patterns and best practices across the engineering organization.",
        narration: {
          third: "During his tenure as Head of Engineering he established architectural patterns and best practices that raised the bar across the entire engineering organization.",
          first: "I established architectural patterns and best practices that raised the bar across the entire engineering organization."
        }
      }
    ]
  },
  {
    id: "exp-panorama-lead",
    type: "experience",
    company: "Panorama AI",
    role: "Lead Software Engineer",
    date: "Dec 2023 - Feb 2026 · 2 yr 3 mos",
    dateNarration: {
      third: "for two years and three months.",
      first: "for two years and three months."
    },
    titleNarration: {
      third: "Prior to taking on the Head of Engineering role at Panorama, Rob led the integration, event emission, and distribution engineering efforts.",
      first: "Prior to taking on the Head of Engineering role at Panorama, I led the integration, event emission, and distribution engineering efforts."
    },
    bullets: [
      {
        text: "Developed the predictive recommendations widget, an embeddable component that delivers personalized product recommendations.",
        narration: {
          third: "Rob developed the predictive recommendations widget - an embeddable component that delivers personalized product recommendations to users.",
          first: "I developed the predictive recommendations widget - an embeddable component that delivers personalized product recommendations to users."
        }
      },
      {
        text: "Wrote the production JavaScript tag system for seamless client integration, enabling real-time data collection.",
        narration: {
          third: "He wrote the production JavaScript tag system, enabling seamless client integration and real-time data collection.",
          first: "I wrote the production JavaScript tag system, enabling seamless client integration and real-time data collection."
        }
      },
      {
        text: "Designed and implemented event emission system that captures user behavior for predictive recommendation models.",
        narration: {
          third: "Rob designed and implemented an event emission system that captures user behavior, feeding data to predictive recommendation models.",
          first: "I designed and implemented an event emission system that captures user behavior, feeding data to predictive recommendation models."
        }
      },
      {
        text: "Established data architecture patterns that enabled Panorama agents and LLMs to accurately answer business intelligence questions.",
        narration: {
          third: "He established data architecture patterns that enabled Panorama's AI agents and LLMs to accurately answer complex business intelligence questions.",
          first: "I established data architecture patterns that enabled Panorama's AI agents and LLMs to accurately answer complex business intelligence questions."
        }
      }
    ]
  },
  {
    id: "exp-snap",
    type: "experience",
    company: "Snap Inc.",
    role: "ARES Web SDK Tech Lead",
    location: "(Snapchat - Santa Monica, CA)",
    date: "Jul 2021 - Sep 2023 · 2 yrs 3 mos",
    dateNarration: {
      third: "for two years and three months, in July twenty-twenty-one.",
      first: "for two years and three months, in July twenty-twenty-one."
    },
    titleNarration: {
      third: "Following Snap's acquisition of Vertebrae, he transitioned to lead the AR Enterprise Shopping Web team at Snap Inc.",
      first: "Following Snap's acquisition of Vertebrae, I transitioned to lead the AR Enterprise Shopping Web team at Snap Inc."
    },
    bullets: [
      {
        text: "Following Snap's acquisition of Vertebrae in July 2021, I transitioned to lead the AR Enterprise Shopping Web team (ARES WEB), working closely with AR Enterprise SDK Native, AR CameraKit For Web, and Ecommerce teams.",
        narration: {
          third: "Rob led the AR Enterprise Shopping Web team, working closely with multiple engineering teams.",
          first: "I led the AR Enterprise Shopping Web team, working closely with multiple engineering teams."
        }
      },
      {
        text: "Designed a robust pub/sub system to seamlessly integrate Snap and Vertebrae backend systems across multiple cloud providers (AWS/GCP). Worked with multiple departments and I implemented Vertebrae's pub/sub integration.",
        narration: {
          third: "He designed a robust PUB SUB system to seamlessly integrate Snap and Vertebrae backend systems across A.W.S. and G.C.P., unifying systems across multiple cloud providers.",
          first: "I designed a robust PUB SUB system to seamlessly integrate Snap and Vertebrae backend systems across A.W.S. and G.C.P., unifying systems across multiple cloud providers."
        }
      },
      {
        text: "Led ARES Web SDK development: ARES web SDK, API design, merchant integration, and event emission systems.",
        narration: {
          third: "Rob led ARES Web SDK development, designing APIs, integrating merchants, and building event emission systems.",
          first: "I led ARES Web SDK development, designing APIs, integrating merchants, and building event emission systems."
        }
      },
      {
        text: "Built Camera Kit enterprise experiences: Led development of ARES camera-kit experience, integrating Snap's Camera Kit on the web with enterprise shopping functionality (remote 3D product asset loading in snap AR \"try-on\" lenses).",
        narration: {
          third: "He built Camera Kit enterprise experiences, integrating Snap's Camera Kit on the web with enterprise shopping functionality - allowing remote 3D product assets to load in AR try-on lenses.",
          first: "I built Camera Kit enterprise experiences, integrating Snap's Camera Kit on the web with enterprise shopping functionality - allowing remote 3D product assets to load in AR try-on lenses."
        }
      },
      {
        text: "Wrote a 3D web product visualization experience that integrated ARES cameraKit product try-on and other Snap ecommerce products.",
        narration: {
          third: "Rob wrote a 3D web product visualization experience that integrated ARES cameraKit product try-on features with Snap's ecommerce products.",
          first: "I wrote a 3D web product visualization experience that integrated ARES cameraKit product try-on features with Snap's ecommerce products."
        }
      }
    ]
  },
  {
    id: "exp-vertebrae",
    type: "experience",
    company: "Vertebrae Inc",
    role: "Senior Fullstack Software Engineer",
    location: "(Santa Monica, CA)",
    date: "Feb 2016 - Jul 2021 · 5 yrs 6 mos",
    dateNarration: {
      third: "for and incredible five years and six months.",
      first: "for five years and six months."
    },
    titleNarration: {
      third: "Rob played a foundational role in building Vertebrae's AR and VR e-commerce platform from the ground up.",
      first: "I played a foundational role in building Vertebrae's AR and VR e-commerce platform from the ground up."
    },
    bullets: [
      {
        text: "Owned, developed, and deployed the majority of cloud infrastructure for the organization.",
        narration: {
          third: "Rob owned, developed, and deployed the majority of cloud infrastructure, building scalable systems for the entire organization.",
          first: "I owned, developed, and deployed the majority of cloud infrastructure, building scalable systems for the entire organization."
        }
      },
      {
        text: "Designed and implemented event emitting and ingestion systems that powered all business intelligence and analytics.",
        narration: {
          third: "He designed and implemented event emitting and ingestion systems that powered all business intelligence and analytics across the company.",
          first: "I designed and implemented event emitting and ingestion systems that powered all business intelligence and analytics across the company."
        }
      },
      {
        text: "Built microservices architecture using container and serverless technologies, enabling scalable and cost-effective infrastructure.",
        narration: {
          third: "Rob built a microservices architecture using containers and serverless technologies, creating infrastructure that scaled with the business while keeping costs under control.",
          first: "I built a microservices architecture using containers and serverless technologies, creating infrastructure that scaled with the business while keeping costs under control."
        }
      },
      {
        text: "Built pioneering AR/VR experiences including a 360° video player, 360° image experiences, virtual try-on, and interactive 3D object viewer.",
        narration: {
          third: "He built pioneering AR and VR experiences - including a 360-degree video player, immersive image experiences, virtual try-on capabilities, and interactive 3D object viewers.",
          first: "I built pioneering AR and VR experiences - including a 360-degree video player, immersive image experiences, virtual try-on capabilities, and interactive 3D object viewers."
        }
      }
    ]
  },
  {
    id: "section-about",
    type: "h2",
    text: "About me",
    narration: {
      voice: "Rob",
      first: "Here is a bit about my background and what drives me."
    }
  },
  {
    id: "about-list",
    type: "ul",
    items: [
      {
        id: "about-1",
        text: "Builder with 20+ years of software and web development experience.",
        narration: {
          voice: "Rob",
          first: "I am a builder with over twenty years of software and web development experience under my belt."
        }
      },
      {
        id: "about-2",
        text: "I'm self-taught, relentlessly curious, and motivated by solving difficult problems with practical, shippable engineering.",
        narration: {
          voice: "Rob",
          first: "I'm self-taught, relentlessly curious, and most motivated by solving difficult problems with practical, shippable engineering solutions."
        }
      },
      {
        id: "about-3",
        text: "I'm happiest in a hands-on Staff/Senior individual contributor role owning products and features end-to-end, especially full-stack product work, AI developer tools, and 3D/XR experiences.",
        narration: {
          voice: "Rob",
          first: "I'm happiest in a hands-on Staff or Senior individual contributor role, owning products and features end-to-end - especially full-stack product work, AI developer tools, and 3D and XR experiences."
        }
      },
      {
        id: "about-4",
        text: "I have been obsessed with agentic coding tools and building apps that utilize local and remote AI model providers.",
        narration: {
          voice: "Rob",
          first: "I've been obsessed with agentic coding tools and building applications that leverage both local and remote AI model providers."
        }
      }
    ]
  },
  {
    id: "section-bring",
    type: "h2",
    text: "What I bring to a team",
    narration: {
      voice: "Rob",
      first: "These are the core strengths and values I bring to every organization I join."
    }
  },
  {
    id: "bring-list",
    type: "ul",
    items: [
      {
        id: "bring-1",
        text: "Foundational ownership (0→1, 1→N): I turn ambiguity into a clear plan, a stable architecture, and incremental deliveries that compound.",
        narration: {
          voice: "Rob",
          first: "I turn ambiguity into a clear plan, a stable architecture, and incremental deliveries that compound over time."
        }
      },
      {
        id: "bring-2",
        text: "I bias for simplicity, reliability, performance, and maintainability, without losing product velocity.",
        narration: {
          voice: "Rob",
          first: "Staff-level judgement - I bias for simplicity, reliability, performance, and maintainability, all while maintaining product velocity."
        }
      },
      {
        id: "bring-3",
        text: "I unify messy systems into clean interfaces (SDKs, APIs, schemas, docs, and reference apps).",
        narration: {
          voice: "Rob",
          first: "Integration leadership - I unify messy, complex systems into clean, well-documented interfaces including SDKs, APIs, schemas, and reference applications."
        }
      },
      {
        id: "bring-4",
        text: "I build across frontend/backend/tooling with the user journey in mind and collaborate tightly with design, product, and partners.",
        narration: {
          voice: "Rob",
          first: "Full-stack ownership - I build across frontend, backend, and tooling with the user journey in mind, collaborating tightly with design, product, and partner teams."
        }
      },
      {
        id: "bring-5",
        text: "I raise team output through reviews, pairing, pragmatic guidelines, and strong docs.",
        narration: {
          voice: "Rob",
          first: "Mentorship and standards - I raise team output through code reviews, pairing sessions, pragmatic guidelines, and comprehensive documentation."
        }
      }
    ]
  },
  {
    id: "section-how",
    type: "h2",
    text: "How I like to work",
    narration: {
      voice: "Rob",
      first: "My philosophy on engineering is built on clarity, reliability, and proactive communication."
    }
  },
  {
    id: "how-list",
    type: "ul",
    items: [
      {
        id: "how-1",
        text: "Align early on outcomes, constraints, and \"definition of done,\" then ship in small, testable increments.",
        narration: {
          voice: "Rob",
          first: "I align early on outcomes, constraints, and the definition of done, then ship in small, testable increments that deliver value quickly."
        }
      },
      {
        id: "how-2",
        text: "Make systems observable (logs/metrics/traces), so issues are diagnosable and reliability scales.",
        narration: {
          voice: "Rob",
          first: "I make systems observable with logs, metrics, and traces, ensuring issues are diagnosable and reliability scales with growth."
        }
      },
      {
        id: "how-3",
        text: "Communicate proactively and unblock others; I care about team health as much as code health.",
        narration: {
          voice: "Rob",
          first: "I communicate proactively, unblock others, and care about team health as much as code health."
        }
      }
    ]
  },
  {
    id: "section-outside",
    type: "h2",
    text: "Outside of work",
    narration: {
      third: "When he's not at a keyboard, you can usually find Rob making music.",
      first: "When I'm not at a keyboard, you can usually find me making music."
    }
  },
  {
    id: "outside-list",
    type: "ul",
    items: [
      {
        id: "outside-1",
        text: "Musician (guitar, drums, keys, ukulele, bass, and any instrument I can get my hands on).",
        narration: {
          third: "A musician at heart - he plays guitar, drums, keys, ukulele, bass, and any instrument he can get his hands on.",
          first: "I'm a musician at heart - I play guitar, drums, keys, ukulele, bass, and any instrument I can get my hands on."
        }
      },
      {
        id: "outside-2",
        text: "I hold an A.S. in Recording Arts and previously worked as an Audio Engineer in Chicago and Los Angeles.",
        narration: {
          third: "Rob holds an Associate of Science degree in Recording Arts and previously worked as an audio engineer in both Chicago and Los Angeles.",
          first: "I hold an Associate of Science degree in Recording Arts and previously worked as an audio engineer in both Chicago and Los Angeles."
        }
      }
    ]
  }
];
