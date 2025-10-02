//frontend/src/app/services/voice-interview.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

export interface InterviewMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isAudio?: boolean;
}

export interface InterviewDomain {
  id: string;
  name: string;
  description: string;
  technicalSkills: string[];
  softSkills: string[];
}

export interface InterviewResponse {
  question?: string;
  followUp?: string;
  feedback?: string;
  summary?: string;
  isCompleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceInterviewService {
  private messagesSubject = new BehaviorSubject<InterviewMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  private audioRecordingSubject = new BehaviorSubject<boolean>(false);
  public audioRecording$ = this.audioRecordingSubject.asObservable();
  
  private aiSpeakingSubject = new BehaviorSubject<boolean>(false);
  public aiSpeaking$ = this.aiSpeakingSubject.asObservable();

  // Track current interview state
  private currentDomain: string = 'javascript';
  private currentQuestionIndex: number = 0;
  private recognition: any;
  private synthesis: SpeechSynthesis;

  public interviewDomains: InterviewDomain[] = [
    {
      id: 'javascript',
      name: 'JavaScript Fundamentals',
      description: 'Core JavaScript concepts, ES6+ features, and modern JS practices',
      technicalSkills: ['ES6+ Features', 'Async/Await', 'Closures', 'Prototypes'],
      softSkills: ['Problem Solving', 'Communication', 'Technical Explanation']
    },
    {
      id: 'data-structures',
      name: 'Data Structures',
      description: 'Fundamental data structures and their implementations',
      technicalSkills: ['Arrays/Lists', 'Trees/Graphs', 'Hash Tables', 'Big O Notation'],
      softSkills: ['Analytical Thinking', 'Optimization', 'Algorithm Design']
    },
    {
      id: 'algorithms',
      name: 'Algorithms',
      description: 'Algorithm design, analysis, and optimization techniques',
      technicalSkills: ['Sorting', 'Searching', 'DP', 'Recursion'],
      softSkills: ['Logical Reasoning', 'Pattern Recognition', 'Efficiency Analysis']
    },
    {
      id: 'system-design',
      name: 'System Design',
      description: 'Designing scalable and efficient software systems',
      technicalSkills: ['Architecture', 'Scalability', 'Databases', 'APIs'],
      softSkills: ['System Thinking', 'Trade-off Analysis', 'Communication']
    },
    {
      id: 'behavioral',
      name: 'Behavioral Questions',
      description: 'Soft skills and situational response evaluation',
      technicalSkills: ['Project Experience', 'Team Collaboration', 'Conflict Resolution'],
      softSkills: ['Leadership', 'Communication', 'Adaptability']
    },
    {
      id: 'frontend',
      name: 'Frontend Development',
      description: 'Modern frontend technologies and frameworks',
      technicalSkills: ['React/Angular/Vue', 'CSS/HTML', 'State Management', 'Performance'],
      softSkills: ['UI/UX Understanding', 'Attention to Detail', 'User Focus']
    },
    {
      id: 'backend',
      name: 'Backend Development',
      description: 'Server-side development and API design',
      technicalSkills: ['Node.js/Python/Java', 'Databases', 'APIs', 'Security'],
      softSkills: ['Architecture Planning', 'Security Mindset', 'Performance Optimization']
    },
    {
      id: 'fullstack',
      name: 'Full Stack Development',
      description: 'End-to-end web application development',
      technicalSkills: ['Frontend & Backend', 'Databases', 'DevOps', 'APIs'],
      softSkills: ['Holistic Thinking', 'Project Management', 'Technical Leadership']
    }
  ];

  private questions: { [key: string]: string[] } = {
    javascript: [
      "Explain the concept of closures in JavaScript with an example.",
      "What are promises and how do they differ from callbacks?",
      "Describe the event loop in JavaScript.",
      "What are the differences between let, const, and var?",
      "Explain prototype inheritance in JavaScript.",
      "What is hoisting in JavaScript?",
      "How does 'this' keyword work in JavaScript?",
      "What are arrow functions and how do they differ from regular functions?",
      "Explain async/await with an example.",
      "What are JavaScript modules and how do you use them?",
      "Describe the difference between == and ===.",
      "What is the purpose of the bind() method?",
      "Explain the concept of currying in JavaScript.",
      "What are generators and how are they useful?",
      "Describe the module pattern in JavaScript.",
      "How do you handle errors in JavaScript?",
      "What are Web Workers and when would you use them?",
      "Explain the same-origin policy and CORS.",
      "What is the event delegation pattern?",
      "How does JavaScript handle memory management?"
    ],
    'data-structures': [
      "What is the time complexity of searching in a binary search tree?",
      "Explain the difference between an array and a linked list.",
      "How does a hash table work?",
      "What are the advantages of using a heap?",
      "Describe breadth-first search and depth-first search.",
      "What is a trie and when would you use it?",
      "Explain the difference between a stack and a queue.",
      "How would you implement a circular buffer?",
      "What are graphs and what are their common representations?",
      "Describe the union-find data structure.",
      "What is a skip list and what are its advantages?",
      "Explain red-black trees and their properties.",
      "How does a Bloom filter work?",
      "What are the different types of tree traversals?",
      "Describe dynamic array implementation.",
      "What is a priority queue and how is it implemented?",
      "Explain the concept of amortized analysis.",
      "What are self-balancing trees?",
      "How does a LRU cache work?",
      "Describe the properties of a B-tree."
    ],
    algorithms: [
      "Explain the quicksort algorithm and its time complexity.",
      "What is dynamic programming? Give an example.",
      "How would you find the shortest path in a graph?",
      "Explain the concept of recursion with an example.",
      "What are greedy algorithms and when are they useful?",
      "Describe the merge sort algorithm.",
      "What is Dijkstra's algorithm and how does it work?",
      "Explain backtracking with an example.",
      "How does binary search work?",
      "What is the Knapsack problem and how would you solve it?",
      "Describe the A* search algorithm.",
      "What are divide and conquer algorithms?",
      "Explain topological sorting.",
      "How would you detect a cycle in a graph?",
      "What is the traveling salesman problem?",
      "Describe the Rabin-Karp string searching algorithm.",
      "What are NP-complete problems?",
      "Explain the Floyd-Warshall algorithm.",
      "How does the Bellman-Ford algorithm work?",
      "What is memoization and how is it different from tabulation?"
    ],
    'system-design': [
      "How would you design a URL shortening service like TinyURL?",
      "Explain the CAP theorem and its implications.",
      "What factors would you consider when designing a scalable system?",
      "How would you handle database migrations in a live system?",
      "Describe microservices architecture and its benefits.",
      "How would you design a social media news feed?",
      "What is consistent hashing and why is it important?",
      "Explain load balancing strategies.",
      "How would you design a distributed cache?",
      "What are the different database replication strategies?",
      "Describe the circuit breaker pattern.",
      "How would you handle rate limiting?",
      "What is event sourcing and when would you use it?",
      "Explain the CQRS pattern.",
      "How would you design a real-time collaborative editor?",
      "What are the trade-offs between SQL and NoSQL databases?",
      "Describe the saga pattern for distributed transactions.",
      "How would you design a recommendation system?",
      "What is sharding and how does it work?",
      "Explain the concept of eventual consistency."
    ],
    behavioral: [
      "Tell me about a challenging project you worked on and how you handled it.",
      "Describe a time when you had to work with a difficult team member.",
      "How do you handle tight deadlines and pressure?",
      "Tell me about a time you made a mistake and how you learned from it.",
      "How do you stay updated with the latest technologies?",
      "Describe a situation where you had to persuade others to adopt your idea.",
      "How do you prioritize tasks when working on multiple projects?",
      "Tell me about a time you showed leadership skills.",
      "How do you handle conflicting feedback from different stakeholders?",
      "Describe your approach to mentoring junior developers.",
      "What do you do when you're stuck on a technical problem?",
      "How do you ensure code quality in your projects?",
      "Tell me about a time you had to learn a new technology quickly.",
      "How do you handle criticism of your work?",
      "Describe your ideal work environment.",
      "What motivates you to do your best work?",
      "How do you balance technical debt with new feature development?",
      "Tell me about a time you went above and beyond for a project.",
      "How do you approach code reviews?",
      "What are your long-term career goals?"
    ],
    frontend: [
      "Explain the Virtual DOM and how it improves performance.",
      "What are the differences between responsive and adaptive design?",
      "How do you optimize web performance?",
      "Explain CSS Grid and Flexbox with their use cases.",
      "What are Web Components and why are they useful?",
      "How does React's diffing algorithm work?",
      "What are the benefits of using TypeScript in frontend development?",
      "Explain the concept of progressive web apps (PWAs).",
      "How do you handle state management in large applications?",
      "What are the differences between Angular, React, and Vue?",
      "How do you implement authentication in a single-page application?",
      "What are CSS-in-JS solutions and when would you use them?",
      "Explain server-side rendering and its benefits.",
      "How do you test frontend applications?",
      "What are web accessibility standards and why are they important?",
      "Describe the component lifecycle in React.",
      "How do you handle cross-browser compatibility issues?",
      "What are the principles of good UI/UX design?",
      "Explain the concept of lazy loading.",
      "How do you secure a frontend application?"
    ],
    backend: [
      "How would you design a RESTful API?",
      "Explain database indexing and its importance.",
      "What are the differences between SQL and NoSQL databases?",
      "How do you handle authentication and authorization?",
      "Describe how you would implement caching in a web application.",
      "What is the difference between horizontal and vertical scaling?",
      "How would you design a rate limiting system?",
      "Explain database connection pooling.",
      "What are message queues and when would you use them?",
      "How do you handle file uploads securely?",
      "Describe the principles of REST architecture.",
      "What is GraphQL and how does it differ from REST?",
      "How would you implement a background job processing system?",
      "What are the best practices for API versioning?",
      "How do you monitor and debug production applications?",
      "Explain the concept of database transactions and ACID properties.",
      "What are microservices and what challenges do they solve?",
      "How would you handle database backups and recovery?",
      "What is containerization and how does it help in deployment?",
      "Describe your approach to API security."
    ],
    fullstack: [
      "Walk me through how you would build a full-stack application from scratch.",
      "How do you ensure security in a full-stack application?",
      "What considerations are important for deployment and DevOps?",
      "How would you handle real-time features in an application?",
      "Describe your approach to testing in a full-stack application.",
      "How do you manage environment configurations across different stages?",
      "What is your strategy for database schema migrations?",
      "How would you implement a search functionality across the entire application?",
      "Describe your approach to error handling and logging.",
      "How do you ensure consistent data flow between frontend and backend?",
      "What are your strategies for performance optimization across the stack?",
      "How would you implement internationalization (i18n) in a full-stack app?",
      "Describe your approach to continuous integration and deployment.",
      "How do you handle file storage and retrieval in a full-stack application?",
      "What are the challenges of building real-time collaborative features?",
      "How would you design a notification system?",
      "Describe your approach to mobile responsiveness and PWA features.",
      "How do you manage secrets and configuration in a full-stack app?",
      "What are your strategies for handling high traffic loads?",
      "How would you implement analytics and monitoring across the entire application?"
    ]
  };

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onstart = () => {
        this.audioRecordingSubject.next(true);
      };
      
      this.recognition.onend = () => {
        this.audioRecordingSubject.next(false);
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        this.audioRecordingSubject.next(false);
      };
    }
  }

  // Public methods
  isSpeechRecognitionSupported(): boolean {
    return 'webkitSpeechRecognition' in window;
  }

  isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  startVoiceInterview(domain: string, difficulty: string): Observable<InterviewResponse> {
    this.clearMessages();
    this.currentQuestionIndex = 0;
    this.currentDomain = domain;
    
    // Ensure domain exists in questions, fallback to javascript
    const safeDomain = this.questions[domain] ? domain : 'javascript';
    const questionCount = this.questions[safeDomain].length;
    
    const welcomeMessage = `Welcome to your ${this.getDomainName(safeDomain)} interview! I'll be asking you ${questionCount} questions. Let's begin with the first question.`;
    this.addMessage('ai', welcomeMessage);
    this.speakMessage(welcomeMessage);
    
    // Ask first question after a short delay
    setTimeout(() => {
      this.askNextQuestion(safeDomain);
    }, 2000);
    
    const firstQuestion = this.questions[safeDomain][0] || "Let's start with the first question.";
    return of({ question: firstQuestion });
  }

  private askNextQuestion(domain: string): void {
    if (this.currentQuestionIndex < this.questions[domain].length) {
      const question = this.questions[domain][this.currentQuestionIndex];
      this.addMessage('ai', question);
      this.speakMessage(question);
      this.currentQuestionIndex++;
    } else {
      this.endInterview().subscribe();
    }
  }

  startListening(): void {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      return;
    }
    
    try {
      this.recognition.start();
      
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.addMessage('user', transcript, true);
        this.processUserResponse(transcript);
      };
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  private processUserResponse(response: string): void {
    // Simulate AI processing and feedback
    const feedback = this.generateFeedback(response);
    
    setTimeout(() => {
      this.addMessage('ai', feedback.feedback!);
      this.speakMessage(feedback.feedback!);
      
      // Ask next question after feedback
      setTimeout(() => {
        this.askNextQuestion(this.currentDomain);
      }, 3000);
    }, 1000);
  }

  private generateFeedback(response: string): InterviewResponse {
    const feedbacks = [
      `Good answer! You covered the main points well. To improve, you could also mention more specific examples related to ${this.getDomainName(this.currentDomain)}.`,
      "That's a solid response. For even better clarity, try structuring your answer with a clear beginning, middle, and end.",
      "You're on the right track. Consider adding more specific examples to strengthen your answer and demonstrate practical experience.",
      "Good understanding shown. You might want to elaborate more on the practical applications and real-world scenarios.",
      "Well explained! To make it more comprehensive, you could discuss alternative approaches or edge cases.",
      "Good technical knowledge demonstrated. Try to connect your answer back to business impact or user experience.",
      "You've got the fundamentals right. Consider discussing how this concept has evolved or where it's headed in the future.",
      "Clear and concise answer. You could enhance it by relating it to your personal project experiences.",
      "Good response. Think about how this concept interacts with other technologies in the stack.",
      "Well articulated. You might want to mention common pitfalls or best practices associated with this topic."
    ];
    
    const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
    
    return {
      feedback: randomFeedback,
      followUp: "Let me ask you the next question..."
    };
  }

  speakMessage(text: string): void {
    if (!this.isSpeechSynthesisSupported()) return;
    
    this.aiSpeakingSubject.next(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onend = () => {
      this.aiSpeakingSubject.next(false);
    };
    
    utterance.onerror = () => {
      this.aiSpeakingSubject.next(false);
    };
    
    this.synthesis.speak(utterance);
  }

  endInterview(): Observable<InterviewResponse> {
    const summary = `Excellent! You've completed all ${this.questions[this.currentDomain].length} questions in the ${this.getDomainName(this.currentDomain)} interview. You demonstrated good technical knowledge and communication skills. Keep practicing to improve your responses.`;
    
    this.addMessage('ai', summary);
    this.speakMessage(summary);
    
    return of({
      summary: summary,
      isCompleted: true
    });
  }

  // Message management
  addMessage(type: 'user' | 'ai', content: string, isAudio: boolean = false): void {
    const messages = this.messagesSubject.value;
    const newMessage: InterviewMessage = {
      type,
      content,
      timestamp: new Date(),
      isAudio
    };
    
    this.messagesSubject.next([...messages, newMessage]);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
    this.currentQuestionIndex = 0;
    this.currentDomain = 'javascript';
  }

  sendResponse(response: string): Observable<InterviewResponse> {
    // For text-based fallback
    this.addMessage('user', response);
    return this.processTextResponse(response);
  }

  private processTextResponse(response: string): Observable<InterviewResponse> {
    return of(this.generateFeedback(response));
  }

  // Helper method to get domain name safely
  private getDomainName(domainId: string): string {
    const domain = this.interviewDomains.find(d => d.id === domainId);
    return domain ? domain.name : 'Technical';
  }

  // Get current progress
  getCurrentProgress(): { current: number; total: number } {
    const total = this.questions[this.currentDomain]?.length || 0;
    return {
      current: this.currentQuestionIndex,
      total: total
    };
  }
}