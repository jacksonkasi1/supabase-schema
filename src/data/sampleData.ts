// Sample data following Supabase OpenAPI structure
export const getSampleData = () => {
  return {
    definitions: {
      users: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string',
            description: '<pk/>',
          },
          email: {
            format: 'varchar',
            type: 'string',
            description: '',
          },
          name: {
            format: 'varchar',
            type: 'string',
            description: '',
          },
          created_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
          updated_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
        },
        required: ['id', 'email'],
      },
      products: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string',
            description: '<pk/>',
          },
          name: {
            format: 'varchar',
            type: 'string',
            description: '',
          },
          description: {
            format: 'text',
            type: 'string',
            description: '',
          },
          price: {
            format: 'numeric',
            type: 'number',
            description: '',
          },
          stock: {
            format: 'integer',
            type: 'number',
            description: '',
          },
          category_id: {
            format: 'uuid',
            type: 'string',
            description: '`categories.id`',
          },
          created_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
        },
        required: ['id', 'name', 'price'],
      },
      categories: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string',
            description: '<pk/>',
          },
          name: {
            format: 'varchar',
            type: 'string',
            description: '',
          },
          slug: {
            format: 'varchar',
            type: 'string',
            description: '',
          },
          created_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
        },
        required: ['id', 'name'],
      },
      orders: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string',
            description: '<pk/>',
          },
          user_id: {
            format: 'uuid',
            type: 'string',
            description: '`users.id`',
          },
          total: {
            format: 'numeric',
            type: 'number',
            description: '',
          },
          status: {
            format: 'varchar',
            type: 'string',
            description: '',
          },
          created_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
          updated_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
        },
        required: ['id', 'user_id', 'total'],
      },
      order_items: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string',
            description: '<pk/>',
          },
          order_id: {
            format: 'uuid',
            type: 'string',
            description: '`orders.id`',
          },
          product_id: {
            format: 'uuid',
            type: 'string',
            description: '`products.id`',
          },
          quantity: {
            format: 'integer',
            type: 'number',
            description: '',
          },
          price: {
            format: 'numeric',
            type: 'number',
            description: '',
          },
          created_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
        },
        required: ['id', 'order_id', 'product_id', 'quantity'],
      },
      reviews: {
        properties: {
          id: {
            format: 'uuid',
            type: 'string',
            description: '<pk/>',
          },
          user_id: {
            format: 'uuid',
            type: 'string',
            description: '`users.id`',
          },
          product_id: {
            format: 'uuid',
            type: 'string',
            description: '`products.id`',
          },
          rating: {
            format: 'integer',
            type: 'number',
            description: '',
          },
          comment: {
            format: 'text',
            type: 'string',
            description: '',
          },
          created_at: {
            format: 'timestamp',
            type: 'string',
            description: '',
          },
        },
        required: ['id', 'user_id', 'product_id', 'rating'],
      },
    },
    paths: {
      '/users': {
        get: {},
        post: {},
        patch: {},
        delete: {},
      },
      '/products': {
        get: {},
        post: {},
        patch: {},
        delete: {},
      },
      '/categories': {
        get: {},
        post: {},
        patch: {},
        delete: {},
      },
      '/orders': {
        get: {},
        post: {},
        patch: {},
        delete: {},
      },
      '/order_items': {
        get: {},
        post: {},
        patch: {},
        delete: {},
      },
      '/reviews': {
        get: {},
        post: {},
        patch: {},
        delete: {},
      },
    },
  };
};

