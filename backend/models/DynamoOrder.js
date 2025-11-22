const { PutCommand, QueryCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');

const TABLE_NAME = process.env.ORDERS_TABLE || 'Tappy_Orders';

class DynamoOrder {
    static async createOrder(order) {
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: order,
            ConditionExpression: 'attribute_not_exists(id)'
        }));
        return order;
    }

    static async getOrder(id) {
        const out = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { id }
        }));
        return out.Item;
    }

    static async getOrdersByUserId(userId) {
        const out = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'UserIndex',
            KeyConditionExpression: 'userId = :u',
            ExpressionAttributeValues: { ':u': userId },
            ScanIndexForward: false
        }));
        return out.Items || [];
    }

    static async updateStatus(id, status, provider) {
        try {
            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { id },
                UpdateExpression: 'set #s = :s, provider = :p, updatedAt = :u',
                ConditionExpression: 'attribute_not_exists(#s) OR #s <> :paid',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: {
                    ':s': status,
                    ':p': provider,
                    ':u': new Date().toISOString(),
                    ':paid': 'PAID'
                }
            }));
            return true;
        } catch (e) {
            if (e.name === 'ConditionalCheckFailedException') {
                return false;
            }
            throw e;
        }
    }
}

module.exports = DynamoOrder;
