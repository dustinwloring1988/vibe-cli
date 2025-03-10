# Example: Creating a React Component with Vibe CLI

This example demonstrates how to use vibe-cli to help you create a React component that fetches data from an API.

## Using the Agent

Start by launching vibe-cli in agent mode:

```bash
vibe agent
```

## Task: Creating a React Component with API Integration

Here's an example conversation with vibe-cli to create a React component:

```
You: I need to create a React component that fetches a list of users from an API endpoint and displays them in a table. The component should handle loading and error states. The API endpoint is https://jsonplaceholder.typicode.com/users.

AI: I'll help you create a React component that fetches user data from the provided API endpoint and displays it in a table, with proper loading and error state handling.

Let's create a UsersTable component. I'll use functional components with hooks, specifically useState and useEffect for state management and side effects.

Here's the component:

```jsx
import React, { useState, useEffect } from 'react';
import './UsersTable.css'; // You'll need to create this CSS file

const UsersTable = () => {
  // State for users data, loading state, and error handling
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch users data when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setUsers(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch users: ' + err.message);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Render loading state
  if (isLoading) {
    return <div className="loading-container">Loading users...</div>;
  }

  // Render error state
  if (error) {
    return <div className="error-container">{error}</div>;
  }

  // Render users table
  return (
    <div className="users-table-container">
      <h2>Users</h2>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Website</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>{user.website}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersTable;
```

Let me also create a basic CSS file for styling:

```css
.users-table-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.users-table th,
.users-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.users-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.users-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.users-table tr:hover {
  background-color: #f1f1f1;
}

.loading-container,
.error-container {
  padding: 20px;
  text-align: center;
  margin-top: 20px;
  border-radius: 4px;
}

.loading-container {
  background-color: #e8f4fd;
  color: #0072c6;
}

.error-container {
  background-color: #fde8e8;
  color: #d32f2f;
}
```

To use this component in your React application:

```jsx
import React from 'react';
import UsersTable from './components/UsersTable';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>User Management</h1>
      </header>
      <main>
        <UsersTable />
      </main>
      <footer>
        <p>© 2025 My Application</p>
      </footer>
    </div>
  );
}

export default App;
```

This component:
1. Fetches user data when it mounts
2. Shows a loading state while fetching
3. Handles and displays errors if the fetch fails
4. Displays the users in a responsive table when data is loaded
5. Includes a "no users found" message if the array is empty

You can customize the styling in the CSS file to match your application's design.

You: Can you add pagination to this component?

AI: Yes, I'll add pagination to the UsersTable component. Here's how we'll modify it to include pagination functionality:

```jsx
import React, { useState, useEffect } from 'react';
import './UsersTable.css';

const UsersTable = () => {
  // State for users data, loading state, and error handling
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(5); // Number of users per page
  
  // Fetch users data when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setUsers(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch users: ' + err.message);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Calculate pagination values
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Go to previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Go to next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Render loading state
  if (isLoading) {
    return <div className="loading-container">Loading users...</div>;
  }

  // Render error state
  if (error) {
    return <div className="error-container">{error}</div>;
  }

  // Render users table with pagination
  return (
    <div className="users-table-container">
      <h2>Users</h2>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <>
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Website</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{user.website}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pagination">
            <button 
              onClick={goToPreviousPage} 
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            <button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
          </div>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages} | 
            Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, users.length)} of {users.length} users
          </div>
        </>
      )}
    </div>
  );
};

export default UsersTable;
```

Let's also update the CSS file to include styles for the pagination:

```css
/* Existing styles... */

/* Pagination styles */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.pagination-pages {
  display: flex;
  gap: 5px;
}

.pagination-button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.pagination-button:hover:not([disabled]) {
  background-color: #0072c6;
  color: white;
}

.pagination-button.active {
  background-color: #0072c6;
  color: white;
  font-weight: bold;
}

.pagination-button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  margin-top: 10px;
  text-align: center;
  color: #666;
  font-size: 0.9em;
}
```

This enhanced component now includes:

1. Pagination state (current page, users per page)
2. Logic to slice the users array to show only the current page
3. Previous, next, and numbered page buttons
4. Visual feedback for the current page and disabled buttons
5. Information about the current viewing range and total users
6. Responsive styling for the pagination controls

You can easily adjust the number of users per page by changing the `usersPerPage` state value.
```

## Saving the Component

To save this component to a file:

```
You: Can you save this component to a file named UsersTable.js and the CSS to UsersTable.css?

AI: I'll save these files for you.

[AI uses tools to create the files]
```

## Next Steps

After creating the component, you might want to ask vibe-cli:

- How to test this component
- How to add sorting functionality
- How to optimize the component for performance
- How to add TypeScript typing to the component

## Example Project Context

For better results, you can create a VIBE.md file in your project:

```markdown
# Project: React User Dashboard

## Technologies
- React 18
- Fetch API for data fetching
- CSS modules for styling

## Coding Guidelines
- Use functional components with hooks
- Follow ESLint configuration
- Handle loading, error, and empty states
- Make components responsive
``` 