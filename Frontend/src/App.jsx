import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app.routes";
import { InterviewProvider } from "./features/interview/interview.context.jsx";

const App = () => {
  return (
    <InterviewProvider>
      <RouterProvider router={router} />
    </InterviewProvider>
  );
};

export default App;