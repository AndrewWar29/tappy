const { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Nombre de la tabla de usuarios en DynamoDB
const TABLE_NAME = 'Tappy_Users';

// Crear un usuario
async function createUser(userData) {
  const { username, email, password, name } = userData;
  
  // Verificar si el usuario ya existe
  const userExists = await getUserByUsername(username) || await getUserByEmail(email);
  if (userExists) {
    throw new Error('Usuario o correo ya registrado');
  }
  
  // Encriptar contraseña
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Crear ID único para el usuario
  const userId = uuidv4();
  
  // Construir objeto de usuario
  const user = {
    id: userId,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password: hashedPassword,
    name: name || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bio: '',
    phone: '',
    avatar: '',
    social: {
      instagram: '',
      facebook: '',
      linkedin: '',
      twitter: '',
      spotify: '',
      youtube: '',
      tiktok: '',
      whatsapp: ''
    }
  };
  
  // Guardar en DynamoDB
  const params = {
    TableName: TABLE_NAME,
    Item: user,
  };
  
  try {
    await docClient.send(new PutCommand(params));
    // No devolver la contraseña
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (err) {
    console.error('Error al guardar usuario en DynamoDB:', err);
    throw new Error('Error al crear usuario');
  }
}

// Obtener un usuario por ID
async function getUserById(userId) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      id: userId
    }
  };
  
  try {
    const { Item } = await docClient.send(new GetCommand(params));
    if (!Item) return null;
    
    // No devolver la contraseña
    const { password, ...userWithoutPassword } = Item;
    return userWithoutPassword;
  } catch (err) {
    console.error('Error al obtener usuario por ID:', err);
    return null;
  }
}

// Obtener un usuario por nombre de usuario
async function getUserByUsername(username) {
  // Como username no es la clave primaria, necesitamos usar GSI o escanear
  // Aquí asumimos que has creado un GSI (índice secundario global) con username como clave
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'UsernameIndex',
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': username.toLowerCase()
    }
  };
  
  try {
    const { Items } = await docClient.send(new QueryCommand(params));
    if (!Items || Items.length === 0) return null;
    
    // No devolver la contraseña
    const { password, ...userWithoutPassword } = Items[0];
    return userWithoutPassword;
  } catch (err) {
    console.error('Error al obtener usuario por username:', err);
    return null;
  }
}

// Obtener un usuario por email
async function getUserByEmail(email) {
  // Como email no es la clave primaria, necesitamos usar GSI o escanear
  // Aquí asumimos que has creado un GSI con email como clave
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email.toLowerCase()
    }
  };
  
  try {
    const { Items } = await docClient.send(new QueryCommand(params));
    if (!Items || Items.length === 0) return null;
    
    return Items[0]; // Incluimos contraseña para validación en login
  } catch (err) {
    console.error('Error al obtener usuario por email:', err);
    return null;
  }
}

// Actualizar un usuario
async function updateUser(userId, updateData) {
  // Verificar si el usuario existe
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }
  
  // No permitir actualizar username ni contraseña aquí
  delete updateData.username;
  delete updateData.password;
  delete updateData.email; // También protegemos el email
  
  // Preparar la expresión de actualización
  let updateExpression = 'SET updatedAt = :updatedAt';
  const expressionAttributeValues = {
    ':updatedAt': new Date().toISOString()
  };
  
  // Añadir cada campo a la expresión de actualización
  Object.entries(updateData).forEach(([key, value]) => {
    // Manejar el objeto social de forma especial
    if (key === 'social' && typeof value === 'object') {
      Object.entries(value).forEach(([socialKey, socialValue]) => {
        updateExpression += `, social.${socialKey} = :social_${socialKey}`;
        expressionAttributeValues[`:social_${socialKey}`] = socialValue;
      });
    } else {
      updateExpression += `, ${key} = :${key}`;
      expressionAttributeValues[`:${key}`] = value;
    }
  });
  
  const params = {
    TableName: TABLE_NAME,
    Key: {
      id: userId
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    // No devolver la contraseña
    const { password, ...userWithoutPassword } = Attributes;
    return userWithoutPassword;
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    throw new Error('Error al actualizar usuario');
  }
}

// Cambiar contraseña de un usuario
async function changePassword(userId, oldPassword, newPassword) {
  // Obtener usuario completo con contraseña
  const params = {
    TableName: TABLE_NAME,
    Key: {
      id: userId
    }
  };
  
  try {
    const { Item } = await docClient.send(new GetCommand(params));
    if (!Item) {
      throw new Error('Usuario no encontrado');
    }
    
    // Verificar contraseña antigua
    const isMatch = await bcrypt.compare(oldPassword, Item.password);
    if (!isMatch) {
      throw new Error('Contraseña actual incorrecta');
    }
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Actualizar la contraseña
    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        id: userId
      },
      UpdateExpression: 'SET password = :password, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':password': hashedPassword,
        ':updatedAt': new Date().toISOString()
      }
    };
    
    await docClient.send(new UpdateCommand(updateParams));
    return { success: true, message: 'Contraseña actualizada correctamente' };
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    throw err;
  }
}

// Autenticar usuario (login)
async function authenticateUser(identifier, password) {
  try {
    // Verificar si el identificador es un email (contiene @)
    let user;
    if (identifier.includes('@')) {
      // Buscar usuario por email
      user = await getUserByEmail(identifier);
    } else {
      // Buscar usuario por username
      user = await getUserByUsername(identifier);
      // Si encontramos el usuario, necesitamos obtener la versión completa con la contraseña
      if (user) {
        user = await getUserByEmail(user.email);
      }
    }
    
    if (!user) {
      throw new Error('Credenciales inválidas');
    }
    
    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }
    
    // Generar JWT
    const payload = {
      user: {
        id: user.id,
        username: user.username
      }
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'tu_secreto_jwt',
      { expiresIn: '24h' }
    );
    
    // No devolver la contraseña
    const { password: pass, ...userWithoutPassword } = user;
    
    return {
      token,
      user: userWithoutPassword
    };
  } catch (err) {
    console.error('Error en autenticación:', err);
    throw err;
  }
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  updateUser,
  changePassword,
  authenticateUser
};
