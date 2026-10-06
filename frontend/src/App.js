import { Redirect, Route, Switch } from "react-router-dom";
import { ChatState } from "./Context/ChatProvider";
import Chatpage from "./Pages/Chatpage";
import Homepage from "./Pages/Homepage";

function App() {
  const { user } = ChatState();

  return (
    <Switch>
      <Route path="/" exact>
        {user ? <Redirect to="/chats" /> : <Homepage />}
      </Route>
      <Route path="/chats">{user ? <Chatpage /> : <Redirect to="/" />}</Route>
      <Redirect to="/" />
    </Switch>
  );
}

export default App;
