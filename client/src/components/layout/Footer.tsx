import { Github, Twitter, HelpCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-neutral-600 text-white py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-2 md:mb-0">
            <p className="text-sm">© {new Date().getFullYear()} Scrum Poker App</p>
          </div>
          <div className="flex space-x-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-neutral-300 hover:text-white transition duration-200"
            >
              <Github className="h-5 w-5" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-neutral-300 hover:text-white transition duration-200"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="#" 
              className="text-neutral-300 hover:text-white transition duration-200 flex items-center"
            >
              <HelpCircle className="h-5 w-5 mr-1" /> Help
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
