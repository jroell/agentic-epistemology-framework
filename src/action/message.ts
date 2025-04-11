import { EntityId, generateId } from '../types/common';

/**
 * A structured unit of information exchanged between entities
 * 
 * Messages are the primary means of communication between agents
 * in the AEF system
 */
export class Message {
  /**
   * Unique identifier for the message
   */
  id: string;
  
  /**
   * ID of the entity that sent the message
   */
  sender: EntityId;
  
  /**
   * ID of the entity that should receive the message
   */
  recipient: EntityId;
  
  /**
   * Content of the message
   */
  content: any;
  
  /**
   * Type of the message (e.g., 'request', 'response', 'notification')
   */
  type: string;
  
  /**
   * ID of the conversation this message belongs to
   */
  conversationId?: string;
  
  /**
   * ID of the message this is in response to
   */
  inReplyTo?: string;
  
  /**
   * Additional metadata for the message
   */
  metadata?: Record<string, any>;
  
  /**
   * Timestamp when the message was created
   */
  timestamp: number;

  /**
   * Create a new message
   * 
   * @param recipient ID of the recipient
   * @param content Content of the message
   * @param sender ID of the sender
   * @param type Type of the message
   * @param conversationId ID of the conversation
   * @param inReplyTo ID of the message this is replying to
   * @param metadata Additional metadata
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    recipient: EntityId,
    content: any,
    sender: EntityId,
    type: string = 'default',
    conversationId?: string,
    inReplyTo?: string,
    metadata?: Record<string, any>,
    id?: string
  ) {
    this.id = id || generateId('msg');
    this.sender = sender;
    this.recipient = recipient;
    this.content = content;
    this.type = type;
    this.conversationId = conversationId;
    this.inReplyTo = inReplyTo;
    this.metadata = metadata;
    this.timestamp = Date.now();
  }

  /**
   * Create a reply to this message
   * 
   * @param content Content of the reply
   * @param type Type of the reply
   * @param metadata Additional metadata
   * @returns A new message that is a reply to this one
   */
  createReply(content: any, type: string = this.type, metadata?: Record<string, any>): Message {
    return new Message(
      this.sender, // Original sender becomes the recipient
      content,
      this.recipient, // Original recipient becomes the sender
      type,
      this.conversationId,
      this.id, // This message's ID becomes the inReplyTo
      metadata
    );
  }

  /**
   * Check if this message is a reply to another message
   * 
   * @returns True if this is a reply
   */
  isReply(): boolean {
    return this.inReplyTo !== undefined;
  }

  /**
   * Check if this message belongs to a conversation
   * 
   * @returns True if this belongs to a conversation
   */
  belongsToConversation(): boolean {
    return this.conversationId !== undefined;
  }

  /**
   * Get a string representation of the message
   * 
   * @returns String representation
   */
  toString(): string {
    const contentPreview = typeof this.content === 'string' 
      ? (this.content.length > 30 ? this.content.substring(0, 27) + '...' : this.content)
      : '[Complex content]';
      
    return `Message(${this.type}): ${this.sender} -> ${this.recipient}: ${contentPreview}`;
  }
}

/**
 * A request message that expects a response
 */
export class RequestMessage extends Message {
  /**
   * Create a new request message
   * 
   * @param recipient ID of the recipient
   * @param content Content of the request
   * @param sender ID of the sender
   * @param conversationId ID of the conversation
   * @param metadata Additional metadata
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    recipient: EntityId,
    content: any,
    sender: EntityId,
    conversationId?: string,
    metadata?: Record<string, any>,
    id?: string
  ) {
    super(
      recipient,
      content,
      sender,
      'request',
      conversationId,
      undefined,
      metadata,
      id
    );
  }
}

/**
 * A response to a request message
 */
export class ResponseMessage extends Message {
  /**
   * Whether the request was successful
   */
  success: boolean;
  
  /**
   * Error message if the request failed
   */
  error?: string;

  /**
   * Create a new response message
   * 
   * @param requestMessage The request message this is responding to
   * @param content Content of the response
   * @param success Whether the request was successful
   * @param error Error message if the request failed
   * @param metadata Additional metadata
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    requestMessage: Message,
    content: any,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, any>,
    id?: string
  ) {
    super(
      requestMessage.sender,
      content,
      requestMessage.recipient,
      'response',
      requestMessage.conversationId,
      requestMessage.id,
      {
        ...metadata,
        success,
        error
      },
      id
    );
    
    this.success = success;
    this.error = error;
  }

  /**
   * Check if the response indicates a successful request
   * 
   * @returns True if the request was successful
   */
  isSuccessful(): boolean {
    return this.success;
  }

  /**
   * Get the error message if the request failed
   * 
   * @returns Error message or undefined if successful
   */
  getError(): string | undefined {
    return this.error;
  }
}

/**
 * A notification message that doesn't expect a response
 */
export class NotificationMessage extends Message {
  /**
   * Create a new notification message
   * 
   * @param recipient ID of the recipient
   * @param content Content of the notification
   * @param sender ID of the sender
   * @param category Category of the notification
   * @param conversationId ID of the conversation
   * @param metadata Additional metadata
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    recipient: EntityId,
    content: any,
    sender: EntityId,
    category: string = 'general',
    conversationId?: string,
    metadata?: Record<string, any>,
    id?: string
  ) {
    super(
      recipient,
      content,
      sender,
      'notification',
      conversationId,
      undefined,
      {
        ...metadata,
        category
      },
      id
    );
  }

  /**
   * Get the category of this notification
   * 
   * @returns Notification category
   */
  getCategory(): string {
    return this.metadata?.category || 'general';
  }
}

/**
 * A broadcast message sent to multiple recipients
 */
export class BroadcastMessage extends Message {
  /**
   * IDs of all recipients
   */
  recipients: EntityId[];

  /**
   * Create a new broadcast message
   * 
   * @param recipients IDs of all recipients
   * @param content Content of the broadcast
   * @param sender ID of the sender
   * @param type Type of the broadcast
   * @param conversationId ID of the conversation
   * @param metadata Additional metadata
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    recipients: EntityId[],
    content: any,
    sender: EntityId,
    type: string = 'broadcast',
    conversationId?: string,
    metadata?: Record<string, any>,
    id?: string
  ) {
    // We still need a primary recipient for the base Message class
    // so we use the first recipient in the list
    super(
      recipients[0],
      content,
      sender,
      type,
      conversationId,
      undefined,
      {
        ...metadata,
        allRecipients: recipients
      },
      id
    );
    
    this.recipients = [...recipients];
  }

  /**
   * Get all recipients of this broadcast
   * 
   * @returns Array of recipient IDs
   */
  getAllRecipients(): EntityId[] {
    return [...this.recipients];
  }

  /**
   * Create an individual message for a specific recipient
   * 
   * @param recipientId ID of the specific recipient
   * @returns A new message for the specific recipient
   */
  createIndividualMessage(recipientId: EntityId): Message {
    if (!this.recipients.includes(recipientId)) {
      throw new Error(`Recipient ${recipientId} is not in the broadcast list`);
    }
    
    return new Message(
      recipientId,
      this.content,
      this.sender,
      this.type,
      this.conversationId,
      undefined,
      this.metadata
    );
  }
}

/**
 * Factory for creating different types of messages
 */
export class MessageFactory {
  /**
   * Create a request message
   * 
   * @param recipient ID of the recipient
   * @param content Content of the request
   * @param sender ID of the sender
   * @returns A new RequestMessage
   */
  static createRequest(
    recipient: EntityId,
    content: any,
    sender: EntityId
  ): RequestMessage {
    return new RequestMessage(recipient, content, sender);
  }

  /**
   * Create a response message
   * 
   * @param requestMessage The request message to respond to
   * @param content Content of the response
   * @param success Whether the request was successful
   * @param error Error message if the request failed
   * @returns A new ResponseMessage
   */
  static createResponse(
    requestMessage: Message,
    content: any,
    success: boolean = true,
    error?: string
  ): ResponseMessage {
    return new ResponseMessage(requestMessage, content, success, error);
  }

  /**
   * Create a notification message
   * 
   * @param recipient ID of the recipient
   * @param content Content of the notification
   * @param sender ID of the sender
   * @param category Category of the notification
   * @returns A new NotificationMessage
   */
  static createNotification(
    recipient: EntityId,
    content: any,
    sender: EntityId,
    category: string = 'general'
  ): NotificationMessage {
    return new NotificationMessage(recipient, content, sender, category);
  }

  /**
   * Create a broadcast message
   * 
   * @param recipients IDs of all recipients
   * @param content Content of the broadcast
   * @param sender ID of the sender
   * @returns A new BroadcastMessage
   */
  static createBroadcast(
    recipients: EntityId[],
    content: any,
    sender: EntityId
  ): BroadcastMessage {
    return new BroadcastMessage(recipients, content, sender);
  }
}
